<script setup>
// =====================================================================
// 流程图设计器（单文件版）
// 参考 logicGate 结构：Vue Flow 画布 + 左侧形状面板，支持拖拽、连线、
// 右键菜单、导入/导出 JSON、导出 PNG。
// 形状：开始/结束（长椭圆）、分支（菱形，Yes/No）、赋值（矩形）、
// 输入输出（平行四边形）、调用函数（矩形左右加竖线）。
// =====================================================================
import {
  onMounted,
  onBeforeUnmount,
  nextTick,
  ref,
  reactive,
  inject,
  defineComponent,
  markRaw,
  h,
} from 'vue'
import { VueFlow, useVueFlow, MarkerType, Handle, Position } from '@vue-flow/core'
import { Background } from '@vue-flow/background'
import { Controls } from '@vue-flow/controls'

// Vue Flow 必需样式（若不引入会导致图形渲染异常、节点不可见）
import '@vue-flow/core/dist/style.css'
import '@vue-flow/core/dist/theme-default.css'
import '@vue-flow/controls/dist/style.css'

/* =====================================================================
 * 形状定义：菜单 + SVG 标记
 * ===================================================================== */
const SHAPES = [
  { type: 'start', label: 'Start', panel: 'Start' },
  { type: 'end', label: 'End', panel: 'End' },
  { type: 'decision', label: 'Branch', panel: 'Decision' },
  { type: 'process', label: 'Assign', panel: 'Process' },
  { type: 'io', label: 'I/O', panel: 'Input/Output' },
  { type: 'call', label: 'Call', panel: 'Call (Function)' },
]

// 返回 viewBox="0 0 100 60" 内部 SVG 标记
function shapeSvg(type) {
  const text = (x, y, content) =>
    `<text x="${x}" y="${y}" text-anchor="middle" font-size="9" font-family="sans-serif" font-weight="600" fill="#111827">${content}</text>`
  switch (type) {
    case 'start': // 长椭圆 Start
      return `<rect x="2" y="18" rx="15" ry="15" width="96" height="24" fill="#dbeafe" stroke="#1d4ed8" stroke-width="1.5"/>` + text(50, 33, 'Start')
    case 'end': // 长椭圆 End
      return `<rect x="2" y="18" rx="15" ry="15" width="96" height="24" fill="#fee2e2" stroke="#b91c1c" stroke-width="1.5"/>` + text(50, 33, 'End')
    case 'decision': // 菱形
      return `<polygon points="50,2 98,30 50,58 2,30" fill="#fef9c3" stroke="#a16207" stroke-width="1.5"/>`
    case 'process': // 矩形（赋值）
      return `<rect x="5" y="15" width="90" height="30" fill="#e0e7ff" stroke="#4338ca" stroke-width="1.5"/>`
    case 'io': // 平行四边形（输入输出）
      return `<polygon points="18,15 95,15 82,45 5,45" fill="#dcfce7" stroke="#15803d" stroke-width="1.5"/>`
    case 'call': // 调用函数：矩形左右各加一竖
      return (
        `<rect x="15" y="15" width="70" height="30" fill="#f3e8ff" stroke="#7e22ce" stroke-width="1.5"/>` +
        `<line x1="15" y1="15" x2="15" y2="45" stroke="#7e22ce" stroke-width="1.5"/>` +
        `<line x1="85" y1="15" x2="85" y2="45" stroke="#7e22ce" stroke-width="1.5"/>`
      )
    default:
      return ''
  }
}
function shapeName(type) {
  return SHAPES.find((s) => s.type === type)?.label || type
}

/* =====================================================================
 * 节点组件（render 函数，内联）
 * ===================================================================== */
const targetHandleTop = (t) => t !== 'start' // 除开始外，顶部入

const FlowNode = defineComponent({
  name: 'FlowNode',
  props: { data: { type: Object, required: true }, id: { type: String, required: true } },
  setup(props) {
    const onCtx = inject('onNodeContextMenu', null)
    return () => {
      const t = props.data.type
      const children = []
      // 目标（顶部入）
      if (targetHandleTop(t)) {
        children.push(h(Handle, { id: 'in', type: 'target', position: Position.Top, style: { top: '-4px' } }))
      }
      // 出口
      if (t === 'decision') {
        children.push(h(Handle, { id: 'yes', type: 'source', position: Position.Right, style: { right: '-4px', top: '50%' } }))
        children.push(h(Handle, { id: 'no', type: 'source', position: Position.Bottom, style: { bottom: '-4px', left: '50%' } }))
      } else if (t !== 'end') {
        children.push(h(Handle, { id: 'out', type: 'source', position: Position.Bottom, style: { bottom: '-4px' } }))
      }
      const innerLabel = props.data.label ?? ''
      children.push(h('svg', { viewBox: '0 0 100 60', class: 'flow-svg', innerHTML: shapeSvg(t) }))
      if (innerLabel) {
        children.push(h('div', { class: 'flow-label' }, innerLabel))
      }
      return h(
        'div',
        {
          class: ['flow-node', 'flow-' + t],
          onContextmenu: (e) => { e.preventDefault(); e.stopPropagation(); if (onCtx) onCtx(props.id, e) },
        },
        children,
      )
    }
  },
})
const nodeTypes = { flow: markRaw(FlowNode) }

/* =====================================================================
 * 画布逻辑
 * ===================================================================== */
const {
  addNodes,
  addEdges,
  removeNodes,
  removeEdges,
  getNodes,
  getEdges,
  onConnect,
  onNodeDragStop,
  screenToFlowCoordinate,
  fitView,
  setNodes,
  setEdges,
} = useVueFlow()

let seq = 0
const nextId = (p) => `${p}-${seq++}`

function addNode(type) {
  const nodes = getNodes.value
  const y = 40 + nodes.length * 90
  addNodes([
    {
      id: nextId(type),
      type: 'flow',
      position: { x: 180, y },
      data: { type, label: shapeName(type), variant: type === 'start' ? 'start' : type === 'end' ? 'end' : undefined },
    },
  ])
}

function removeNode(id) {
  const es = getEdges.value.filter((e) => e.source === id || e.target === id).map((e) => e.id)
  if (es.length) removeEdges(es)
  removeNodes([id])
}

// 连线：从菱形出发的线自动标注 Yes / No
const edgeLabelFor = (sourceId, sourceHandle) => {
  const src = getNodes.value.find((n) => n.id === sourceId)
  if (src?.data.type === 'decision') return sourceHandle === 'no' ? 'No' : 'Yes'
  return ''
}

onConnect((params) => {
  addEdges([
    {
      ...params,
      type: 'smoothstep',
      markerEnd: MarkerType.ArrowClosed,
      label: edgeLabelFor(params.source, params.sourceHandle),
    },
  ])
})

/* ---- 拖拽 / 放下 ---- */
const sidebarEl = ref(null)
const pointer = reactive({ x: 0, y: 0 })
function onPointerMove(e) { pointer.x = e.clientX; pointer.y = e.clientY }
function isOverSidebar(x, y) {
  const el = sidebarEl.value?.$el || sidebarEl.value
  if (!el) return false
  const r = el.getBoundingClientRect()
  return x >= r.left && x <= r.right && y >= r.top && y <= r.bottom
}
function resolveDrag(payload) {
  const node = payload && payload.node ? payload.node : payload
  const ev = payload && payload.event
  const x = ev && typeof ev.clientX === 'number' ? ev.clientX : pointer.x
  const y = ev && typeof ev.clientY === 'number' ? ev.clientY : pointer.y
  return { node, x, y }
}
function onDragStop(payload) {
  const { node, x, y } = resolveDrag(payload)
  if (node && isOverSidebar(x, y)) {
    try { removeNode(node.id) } catch (e) { /* ignore */ }
  }
}
onNodeDragStop(onDragStop)
function onDragStart(e, type) {
  e.dataTransfer.setData('application/flowchart', type)
  e.dataTransfer.effectAllowed = 'move'
  const svg = e.currentTarget.querySelector('svg')
  if (svg) {
    const clone = svg.cloneNode(true)
    clone.style.position = 'fixed'
    clone.style.top = '-1000px'
    clone.style.left = '0'
    clone.style.background = 'transparent'
    clone.style.border = 'none'
    clone.style.width = svg.clientWidth + 'px'
    clone.style.height = svg.clientHeight + 'px'
    document.body.appendChild(clone)
    e.dataTransfer.setDragImage(clone, svg.clientWidth / 2, svg.clientHeight / 2)
    setTimeout(() => clone.remove(), 0)
  }
}
function onDragOver(e) {
  e.preventDefault()
  e.dataTransfer.dropEffect = 'move'
}
function onDrop(e) {
  e.preventDefault()
  const type = e.dataTransfer.getData('application/flowchart')
  if (!type) return
  const pos = screenToFlowCoordinate({ x: e.clientX, y: e.clientY })
  if (type === 'decision') {
    // 分支节点：自动带出两个承接节点并连线，第一个 Yes、第二个 No
    const dec = { id: nextId('decision'), type: 'flow', position: pos, data: { type: 'decision', label: shapeName('decision') } }
    const yesNode = { id: nextId('process'), type: 'flow', position: { x: pos.x + 160, y: pos.y + 20 }, data: { type: 'process', label: '' } }
    const noNode = { id: nextId('process'), type: 'flow', position: { x: pos.x - 40, y: pos.y + 140 }, data: { type: 'process', label: '' } }
    addNodes([dec, yesNode, noNode])
    addEdges([
      { id: nextId('e'), source: dec.id, target: yesNode.id, sourceHandle: 'yes', targetHandle: 'in', type: 'smoothstep', markerEnd: MarkerType.ArrowClosed, label: 'Yes' },
      { id: nextId('e'), source: dec.id, target: noNode.id, sourceHandle: 'no', targetHandle: 'in', type: 'smoothstep', markerEnd: MarkerType.ArrowClosed, label: 'No' },
    ])
    return
  }
  addNodes([{ id: nextId(type), type: 'flow', position: pos, data: { type, label: shapeName(type) } }])
}

/* ---- 右键菜单 ---- */
const contextMenu = ref({ show: false, x: 0, y: 0, nodeId: null })
const canvasWrap = ref(null)
provide('onNodeContextMenu', handleNodeContextMenu)
function closeMenu() { contextMenu.value = { ...contextMenu.value, show: false } }
function handleNodeContextMenu(id, event) {
  event.preventDefault()
  event.stopPropagation()
  contextMenu.value = { show: true, x: event.clientX, y: event.clientY, nodeId: id }
}
function handlePaneContextMenu(event) {
  event.preventDefault()
  event.stopPropagation()
  contextMenu.value = { show: true, x: event.clientX, y: event.clientY, nodeId: null }
}
function ctxRename() {
  const id = contextMenu.value.nodeId
  if (!id) { closeMenu(); return }
  const n = getNodes.value.find((x) => x.id === id)
  if (n) {
    const newLabel = prompt('Edit label:', n.data.label ?? '')
    const nodes = getNodes.value.map((x) => (x.id === id ? { ...x, data: { ...x.data, label: newLabel } } : x))
    setNodes(nodes)
  }
  closeMenu()
}
function ctxDelete() {
  if (contextMenu.value.nodeId) removeNode(contextMenu.value.nodeId)
  closeMenu()
}

onMounted(async () => {
  window.addEventListener('pointermove', onPointerMove)
  window.addEventListener('click', closeMenu)
  buildDemo()
  await nextTick()
  fitView()
})
onBeforeUnmount(() => {
  window.removeEventListener('click', closeMenu)
  window.removeEventListener('pointermove', onPointerMove)
  const root = canvasWrap.value
  if (root && root._flowDestroy) root._flowDestroy()
})

/* ---- 导入 / 导出 JSON ---- */
function downloadBlob(blob, filename) {
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = filename
  a.click()
  setTimeout(() => URL.revokeObjectURL(a.href), 1000)
}
function exportJson() {
  const data = {
    version: 1,
    type: 'flowchart',
    nodes: getNodes.value.map((n) => ({
      id: n.id,
      type: n.type,
      position: { x: n.position.x, y: n.position.y },
      data: n.data,
    })),
    edges: getEdges.value.map((e) => ({
      id: e.id,
      source: e.source,
      target: e.target,
      sourceHandle: e.sourceHandle,
      targetHandle: e.targetHandle,
      label: e.label,
    })),
  }
  downloadBlob(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }), 'flowchart.json')
}

const fileInput = ref(null)
function triggerImport() { fileInput.value?.click() }
function importJson(e) {
  const file = e.target.files?.[0]
  if (!file) return
  const reader = new FileReader()
  reader.onload = () => {
    try {
      const data = JSON.parse(String(reader.result))
      if (data.type && data.type !== 'flowchart') throw new Error('Not a flowchart file')
      setNodes((data.nodes || []).map((n) => ({
        ...n,
        position: { x: n.position.x, y: n.position.y },
        type: 'flow',
      })))
      setEdges((data.edges || []).map((ed) => ({
        ...ed,
        type: 'smoothstep',
        markerEnd: MarkerType.ArrowClosed,
        label: ed.label || '',
      })))
      nextTick(fitView)
    } catch (err) {
      alert('JSON parse failed: ' + err.message)
    }
  }
  reader.readAsText(file)
  e.target.value = ''
}
function clearAll() {
  setNodes([])
  setEdges([])
}

/* ---- 导出 PNG ---- */
function nodeSize(node) {
  return { w: node.dimensions?.width || 100, h: node.dimensions?.height || 60 }
}
function handleXY(node, handle) {
  const { w, h } = nodeSize(node)
  const x = node.position.x
  const y = node.position.y
  if (handle === 'yes') return { x: x + w, y: y + h / 2 }
  if (handle === 'no') return { x: x + w / 2, y: y + h }
  return { x: x + w / 2, y: y + h }
}
function exportPng() {
  const nodes = getNodes.value
  const edges = getEdges.value
  const nodeMap = new Map(nodes.map((n) => [n.id, n]))
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity
  nodes.forEach((n) => {
    const { w, h } = nodeSize(n)
    minX = Math.min(minX, n.position.x); minY = Math.min(minY, n.position.y)
    maxX = Math.max(maxX, n.position.x + w); maxY = Math.max(maxY, n.position.y + h)
  })
  if (!isFinite(minX)) { minX = 0; minY = 0; maxX = 100; maxY = 100 }
  const pad = 40
  const vbX = minX - pad, vbY = minY - pad, vbW = maxX - minX + pad * 2, vbH = maxY - minY + pad * 2
  const parts = []
  edges.forEach((e) => {
    const s = nodeMap.get(e.source), t = nodeMap.get(e.target)
    if (!s || !t) return
    const p1 = handleXY(s, e.sourceHandle)
    const p2 = handleXY(t, e.targetHandle)
    const mx = (p1.x + p2.x) / 2
    parts.push(`<path d="M ${p1.x} ${p1.y} C ${mx} ${p1.y}, ${mx} ${p2.y}, ${p2.x} ${p2.y}" fill="none" stroke="#475569" stroke-width="2"/>`)
    if (e.label) parts.push(`<text x="${mx}" y="${(p1.y + p2.y) / 2 - 4}" text-anchor="middle" font-size="11" font-family="sans-serif" fill="#b91c1c">${e.label}</text>`)
  })
  nodes.forEach((n) => {
    const { w, h } = nodeSize(n)
    parts.push(`<g transform="translate(${n.position.x},${n.position.y})"><svg x="0" y="0" width="${w}" height="${h}" viewBox="0 0 100 60">${shapeSvg(n.data.type)}</svg></g>`)
    const label = n.data.label
    if (label) parts.push(`<text x="${n.position.x + w / 2}" y="${n.position.y + h / 2 + 4}" text-anchor="middle" font-size="12" font-family="sans-serif" font-weight="600" fill="#111827">${label}</text>`)
  })
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${vbW}" height="${vbH}" viewBox="${vbX} ${vbY} ${vbW} ${vbH}">${parts.join('')}</svg>`
  const url = URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml;charset=utf-8' }))
  const img = new Image()
  img.onload = () => {
    const scale = 2
    const canvas = document.createElement('canvas')
    canvas.width = img.width * scale
    canvas.height = img.height * scale
    const ctx = canvas.getContext('2d')
    ctx.scale(scale, scale)
    ctx.drawImage(img, 0, 0)
    URL.revokeObjectURL(url)
    canvas.toBlob((b) => { if (b) downloadBlob(b, 'flowchart.png') }, 'image/png')
  }
  img.onerror = () => { URL.revokeObjectURL(url) }
  img.src = url
}

/* ---- 示例 ---- */
function buildDemo() {
  const nodes = [
    { id: nextId('start'), type: 'flow', position: { x: 180, y: 20 }, data: { type: 'start', label: 'Start', variant: 'start' } },
    { id: nextId('io'), type: 'flow', position: { x: 180, y: 120 }, data: { type: 'io', label: 'INPUT Score' } },
    { id: nextId('process'), type: 'flow', position: { x: 180, y: 220 }, data: { type: 'process', label: 'Total = 0' } },
    { id: nextId('decision'), type: 'flow', position: { x: 180, y: 320 }, data: { type: 'decision', label: 'Score ≥ 60?' } },
    { id: nextId('io'), type: 'flow', position: { x: 40, y: 440 }, data: { type: 'io', label: 'OUTPUT "Pass"' } },
    { id: nextId('process'), type: 'flow', position: { x: 320, y: 440 }, data: { type: 'process', label: 'OUTPUT "Fail"' } },
    { id: nextId('end'), type: 'flow', position: { x: 180, y: 560 }, data: { type: 'end', label: 'End', variant: 'end' } },
  ]
  const edges = [
    { id: nextId('e'), source: nodes[0].id, target: nodes[1].id, sourceHandle: 'out', targetHandle: 'in', type: 'smoothstep', markerEnd: MarkerType.ArrowClosed, label: '' },
    { id: nextId('e'), source: nodes[1].id, target: nodes[2].id, sourceHandle: 'out', targetHandle: 'in', type: 'smoothstep', markerEnd: MarkerType.ArrowClosed, label: '' },
    { id: nextId('e'), source: nodes[2].id, target: nodes[3].id, sourceHandle: 'out', targetHandle: 'in', type: 'smoothstep', markerEnd: MarkerType.ArrowClosed, label: '' },
    { id: nextId('e'), source: nodes[3].id, target: nodes[4].id, sourceHandle: 'yes', targetHandle: 'in', type: 'smoothstep', markerEnd: MarkerType.ArrowClosed, label: 'Yes' },
    { id: nextId('e'), source: nodes[3].id, target: nodes[5].id, sourceHandle: 'no', targetHandle: 'in', type: 'smoothstep', markerEnd: MarkerType.ArrowClosed, label: 'No' },
    { id: nextId('e'), source: nodes[4].id, target: nodes[6].id, sourceHandle: 'out', targetHandle: 'in', type: 'smoothstep', markerEnd: MarkerType.ArrowClosed, label: '' },
    { id: nextId('e'), source: nodes[5].id, target: nodes[6].id, sourceHandle: 'out', targetHandle: 'in', type: 'smoothstep', markerEnd: MarkerType.ArrowClosed, label: '' },
  ]
  setNodes(nodes)
  setEdges(edges)
}
</script>

<template>
  <ClientOnly>
    <div class="flow-app">
      <header class="flow-topbar">
      <div class="flow-title">Flowchart Designer</div>
      <div class="flow-toolbar">
        <button class="tb-import" @click="triggerImport">Import JSON</button>
        <button class="tb-json" @click="exportJson">Export JSON</button>
        <button class="tb-png" @click="exportPng">Export PNG</button>
        <button class="tb-clear" @click="clearAll">Clear</button>
        <button class="tb-demo" @click="buildDemo">Demo</button>
        <input ref="fileInput" type="file" accept="application/json" hidden @change="importJson" />
      </div>
    </header>
    <div class="flow-main">
      <aside ref="sidebarEl" class="flow-sidebar">
        <div class="flow-panel-head">Shapes (drag to canvas)</div>
        <div class="flow-shape-list">
          <div
            v-for="s in SHAPES"
            :key="s.type"
            class="flow-shape-item"
            draggable="true"
            :title="s.panel"
            @dragstart="onDragStart($event, s.type)"
          >
            <svg viewBox="0 0 100 60" class="flow-preview" v-html="shapeSvg(s.type)"></svg>
            <span class="flow-shape-label">{{ s.panel }}</span>
          </div>
        </div>
      </aside>
      <div ref="canvasWrap" class="flow-canvas" @drop="onDrop" @dragover="onDragOver" @contextmenu="handlePaneContextMenu">
        <VueFlow
          :node-types="nodeTypes"
          :delete-key-code="['Delete', 'Backspace']"
          :auto-pan-on-node-drag="false"
          :default-edge-options="{ type: 'smoothstep', markerEnd: MarkerType.ArrowClosed }"
          :fit-view-on-init="true"
          :default-viewport="{ zoom: 0.85 }"
        >
          <Background :gap="16" />
          <Controls />
        </VueFlow>
      </div>
    </div>

    <transition name="fade">
      <div
        v-if="contextMenu.show"
        class="flow-ctxmenu"
        :style="{ left: contextMenu.x + 'px', top: contextMenu.y + 'px' }"
      >
        <button v-if="contextMenu.nodeId" @click="ctxRename">Edit label</button>
        <button v-if="contextMenu.nodeId" class="danger" @click="ctxDelete">Delete</button>
      </div>
    </transition>
    </div>
  </ClientOnly>
</template>

<style>
.flow-app { display: flex; flex-direction: column; height: 100%; min-height: 520px; }
.flow-topbar {
  display: flex; align-items: center; justify-content: space-between;
  padding: 8px 14px; background: #0f172a; color: #fff; gap: 12px; flex-wrap: wrap;
}
.flow-title { font-size: 15px; font-weight: 700; white-space: nowrap; }
.flow-toolbar { display: flex; gap: 8px; }
.flow-toolbar button {
  color: #fff; border: none; border-radius: 6px; padding: 6px 12px;
  font-size: 12px; font-weight: 600; cursor: pointer;
}
.tb-import { background: #8b5cf6; } .tb-import:hover { background: #7c3aed; }
.tb-json { background: #10b981; } .tb-json:hover { background: #059669; }
.tb-png { background: #f59e0b; } .tb-png:hover { background: #d97706; }
.tb-clear { background: #ef4444; } .tb-clear:hover { background: #dc2626; }
.tb-demo { background: #6366f1; } .tb-demo:hover { background: #4f46e5; }
.flow-main { display: flex; flex: 1; min-height: 0; }
.flow-sidebar {
  width: 200px; background: #fff; border-right: 1px solid #e5e7eb;
  padding: 12px; overflow: auto; flex-shrink: 0;
}
.flow-panel-head { font-size: 12px; font-weight: 700; color: #374151; text-transform: uppercase; letter-spacing: .04em; margin-bottom: 10px; }
.flow-shape-list { display: flex; flex-direction: column; gap: 8px; }
.flow-shape-item {
  display: flex; align-items: center; gap: 8px; padding: 6px 8px;
  background: #f8fafc; border: 1px solid #cbd5e1; border-radius: 6px;
  cursor: grab; user-select: none;
}
.flow-shape-item:hover { background: #e2e8f0; border-color: #94a3b8; }
.flow-shape-item:active { cursor: grabbing; }
.flow-preview { width: 52px; height: 32px; flex-shrink: 0; }
.flow-shape-label { font-size: 12px; color: #1f2937; font-weight: 500; }
.flow-canvas { flex: 1; position: relative; min-width: 0; }

/* 节点 */
.flow-node { width: 100px; }
.flow-svg { width: 100%; height: auto; display: block; border-radius: 4px; }
.flow-label {
  position: absolute; left: 50%; top: 50%; transform: translate(-50%, -50%);
  width: 80%; text-align: center; font-size: 11px; color: #111827;
  font-weight: 600; pointer-events: none; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
}
.flow-node { position: relative; }
.vue-flow__node.selected .flow-svg { outline: 2px solid #3b82f6; outline-offset: 3px; border-radius: 6px; }

/* 上下文菜单 */
.flow-ctxmenu {
  position: fixed; z-index: 60; min-width: 120px; background: #fff;
  border: 1px solid #e5e7eb; border-radius: 8px; box-shadow: 0 10px 30px rgba(0,0,0,0.18);
  padding: 4px; display: flex; flex-direction: column; gap: 2px;
}
.flow-ctxmenu button {
  text-align: left; border: none; background: transparent; padding: 7px 12px;
  border-radius: 6px; font-size: 13px; cursor: pointer; color: #1f2937;
}
.flow-ctxmenu button:hover:not(:disabled) { background: #f1f5f9; }
.flow-ctxmenu button.danger { color: #dc2626; }
.flow-ctxmenu button.danger:hover { background: #fef2f2; }
.fade-enter-active, .fade-leave-active { transition: opacity 0.12s ease; }
.fade-enter-from, .fade-leave-to { opacity: 0; }

/* 连线标签 */
.vue-flow__edge-text { fill: #b91c1c; font-size: 12px; font-weight: 700; }
</style>