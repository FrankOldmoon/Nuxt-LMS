<script setup>
// =====================================================================
// 逻辑电路设计器（单文件版）
// 由原独立 Vite 应用合并而成：App / GateNode / IoNode / Sidebar 组件
// 及 gates.js / circuit.js / expr2circuit.js 与全部样式。
// =====================================================================
import {
  onMounted,
  onBeforeUnmount,
  computed,
  nextTick,
  ref,
  reactive,
  watch,
  provide,
  inject,
  defineComponent,
  markRaw,
  h
} from 'vue'
import { VueFlow, useVueFlow, MarkerType, Handle, Position } from '@vue-flow/core'
import { Background } from '@vue-flow/background'
import { Controls } from '@vue-flow/controls'
import katex from 'katex'

// 依赖库样式（原 main.js 导入）
import '@vue-flow/core/dist/style.css'
import '@vue-flow/core/dist/theme-default.css'
import '@vue-flow/controls/dist/style.css'
import 'katex/dist/katex.min.css'

/* =====================================================================
 * 原 gates.js —— 逻辑门定义：菜单、SVG 符号、求值与表达式生成
 * ===================================================================== */
const GATES = [
  { type: 'and', label: 'AND', inputs: 2 },
  { type: 'or', label: 'OR', inputs: 2 },
  { type: 'not', label: 'NOT', inputs: 1 },
  { type: 'xor', label: 'XOR', inputs: 2 },
  { type: 'nand', label: 'NAND', inputs: 2 },
  { type: 'nor', label: 'NOR', inputs: 2 }
]

const wire = (x1, y1, x2, y2) =>
  `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="#374151" stroke-width="2"/>`
const path = (d) => `<path d="${d}" fill="#fff" stroke="#111827" stroke-width="2"/>`
const bubble = (cx, cy) =>
  `<circle cx="${cx}" cy="${cy}" r="5" fill="#fff" stroke="#111827" stroke-width="2"/>`

// 返回 viewBox="0 0 160 100" 内部 SVG 标记
function gateSvg(type) {
  switch (type) {
    case 'and':
      return (
        wire(0, 30, 45, 30) +
        wire(0, 70, 45, 70) +
        wire(95, 50, 160, 50) +
        path('M45 20 L70 20 A30 30 0 0 1 70 80 L45 80 Z')
      )
    case 'or':
      return (
        wire(0, 30, 45, 30) +
        wire(0, 70, 45, 70) +
        wire(105, 50, 160, 50) +
        path('M45 20 Q85 20 105 50 Q85 80 45 80 Q60 50 45 20 Z')
      )
    case 'not':
      return (
        wire(0, 50, 45, 50) +
        wire(100, 50, 160, 50) +
        path('M45 25 L90 50 L45 75 Z') +
        bubble(95, 50)
      )
    case 'xor':
      return (
        wire(0, 30, 55, 30) +
        wire(0, 70, 55, 70) +
        wire(115, 50, 160, 50) +
        path('M35 20 Q50 50 35 80') +
        path('M55 20 Q95 20 115 50 Q95 80 55 80 Q70 50 55 20 Z')
      )
    case 'nand':
      return (
        wire(0, 30, 45, 30) +
        wire(0, 70, 45, 70) +
        wire(110, 50, 160, 50) +
        path('M45 20 L70 20 A30 30 0 0 1 70 80 L45 80 Z') +
        bubble(105, 50)
      )
    case 'nor':
      return (
        wire(0, 30, 45, 30) +
        wire(0, 70, 45, 70) +
        wire(110, 50, 160, 50) +
        path('M45 20 Q85 20 105 50 Q85 80 45 80 Q60 50 45 20 Z') +
        bubble(110, 50)
      )
    default:
      return ''
  }
}

function applyGate(type, a, b) {
  switch (type) {
    case 'and':
      return a && b ? 1 : 0
    case 'or':
      return a || b ? 1 : 0
    case 'xor':
      return a ^ b ? 1 : 0
    case 'nand':
      return a && b ? 0 : 1
    case 'nor':
      return a || b ? 0 : 1
    case 'not':
      return a ? 0 : 1
    default:
      return 0
  }
}

// 返回 KaTeX 可识别的中缀表达式字符串（NOT 用上划线 \overline 表示）
function gateExpr(type, a, b) {
  switch (type) {
    case 'and':
      return `(${a} \\cdot ${b})`
    case 'or':
      return `(${a} + ${b})`
    case 'xor':
      return `(${a} \\oplus ${b})`
    case 'nand':
      return `\\overline{${a} \\cdot ${b}}`
    case 'nor':
      return `\\overline{${a} + ${b}}`
    case 'not':
      return `\\overline{${a}}`
    default:
      return '0'
  }
}

/* =====================================================================
 * 原 circuit.js —— 遍历节点图，计算每个输出节点的值与表达式
 * ===================================================================== */
// override: 可选 { nodeId: 0|1 }，用于真值表枚举时覆盖输入状态。
function evaluateCircuit(nodes, edges, override) {
  const nodeMap = new Map(nodes.map((n) => [n.id, n]))
  const incoming = (id) => edges.filter((e) => e.target === id)
  const inputVal = (id) =>
    override && id in override ? override[id] : nodeMap.get(id)?.data.value ? 1 : 0

  const memo = {}
  const visiting = new Set()

  function val(id) {
    if (memo[id] !== undefined) return memo[id]
    if (visiting.has(id)) return 0 // 环保护
    visiting.add(id)
    const node = nodeMap.get(id)
    let v = 0
    if (node) {
      if (node.type === 'io' && node.data.ioType === 'input') {
        v = inputVal(id)
      } else if (node.type === 'io' && node.data.ioType === 'output') {
        const ins = incoming(id)
        v = ins.length ? val(ins[0].source) : 0
      } else {
        // gate：按 handle 顺序取两个输入
        const ins = incoming(id).sort((a, b) =>
          (a.targetHandle || 'in-1').localeCompare(b.targetHandle || 'in-2')
        )
        const a = ins[0] ? val(ins[0].source) : 0
        const b = ins[1] ? val(ins[1].source) : 0
        v = applyGate(node.data.gateType, a, b)
      }
    }
    visiting.delete(id)
    memo[id] = v
    return v
  }

  function exprOf(id) {
    const node = nodeMap.get(id)
    if (!node) return '0'
    if (node.type === 'io' && node.data.ioType === 'input') return node.data.label
    if (node.type === 'io' && node.data.ioType === 'output') {
      const ins = incoming(id)
      return ins.length ? exprOf(ins[0].source) : '0'
    }
    const ins = incoming(id)
    const a = ins[0] ? exprOf(ins[0].source) : '0'
    const b = ins[1] ? exprOf(ins[1].source) : '0'
    return gateExpr(node.data.gateType, a, b)
  }

  const outputs = nodes
    .filter((n) => n.type === 'io' && n.data.ioType === 'output')
    .map((n) => ({ id: n.id, label: n.data.label, value: val(n.id), tex: exprOf(n.id) }))

  // 返回所有节点计算值（含源节点），供连线着色判断每条边是否高电平(True)
  return { outputs, nodeValues: memo }
}

/* =====================================================================
 * 原 expr2circuit.js —— 布尔表达式解析为电路 / 电路反生成表达式
 * ===================================================================== */
// 支持的语法：
//   多输出用换行或 ';' 分隔；每行形如  name = expr
//   变量：字母 / 数字 / 下划线组合，每个不同变量生成一个输入节点
//   运算符（大小写不敏感）：AND:*·&AND·\land  OR:+|OR\lor  XOR:#⊕XOR\oplus
//   NAND:^(a*b)  NOR:^(a+b)  NOT:^~!NOT（前缀）；'（后缀）；\overline{...}（函数式）
const WORD_OPS = {
  and: 'AND',
  or: 'OR',
  xor: 'XOR',
  nand: 'NAND',
  nor: 'NOR',
  not: 'NOT',
  land: 'AND',
  lor: 'OR',
  cdot: 'AND',
  oplus: 'XOR'
}

function tokenize(src) {
  const tokens = []
  const n = src.length
  let i = 0
  while (i < n) {
    const c = src[i]
    if (c === ' ' || c === '\t' || c === '\r') {
      i++
      continue
    }
    if (c === '\n' || c === ';') {
      tokens.push({ t: 'SEP' })
      i++
      continue
    }
    if (c === '=') {
      tokens.push({ t: 'EQ' })
      i++
      continue
    }
    if (c === '(') {
      tokens.push({ t: 'LP' })
      i++
      continue
    }
    if (c === ')') {
      tokens.push({ t: 'RP' })
      i++
      continue
    }
    if (c === '{') {
      tokens.push({ t: 'LB' })
      i++
      continue
    }
    if (c === '}') {
      tokens.push({ t: 'RB' })
      i++
      continue
    }
    if (c === "'") {
      tokens.push({ t: 'PRIME' })
      i++
      continue
    }
    if (c === '*' || c === '·' || c === '&') {
      tokens.push({ t: 'AND' })
      i++
      continue
    }
    if (c === '+' || c === '|') {
      tokens.push({ t: 'OR' })
      i++
      continue
    }
    if (c === '^') {
      tokens.push({ t: 'NOT' })
      i++
      continue
    }
    if (c === '#' || c === '⊕') {
      tokens.push({ t: 'XOR' })
      i++
      continue
    }
    if (c === '~' || c === '!') {
      tokens.push({ t: 'NOT' })
      i++
      continue
    }
    if (c === '\\') {
      let j = i + 1
      let cmd = ''
      while (j < n && /[a-zA-Z]/.test(src[j])) {
        cmd += src[j]
        j++
      }
      i = j
      const low = cmd.toLowerCase()
      if (low === 'overline') tokens.push({ t: 'OVERLINE' })
      else if (WORD_OPS[low]) tokens.push({ t: WORD_OPS[low] })
      else throw new Error('Unknown command \\' + cmd)
      continue
    }
    if (/[a-zA-Z_]/.test(c)) {
      let j = i
      let name = ''
      while (j < n && /[a-zA-Z0-9_]/.test(src[j])) {
        name += src[j]
        j++
      }
      i = j
      if (/^[a-zA-Z]+$/.test(name) && WORD_OPS[name.toLowerCase()])
        tokens.push({ t: WORD_OPS[name.toLowerCase()] })
      else tokens.push({ t: 'ID', v: name })
      continue
    }
    throw new Error('Unrecognized character: ' + c)
  }
  tokens.push({ t: 'EOF' })
  return tokens
}

function parse(tokens) {
  let pos = 0
  const peek = () => tokens[pos]
  const next = () => tokens[pos++]
  const expect = (t) => {
    if (tokens[pos].t !== t) throw new Error('Syntax error: expected ' + t)
    return tokens[pos++]
  }

  function parseStatements() {
    const stmts = []
    while (peek().t !== 'EOF') {
      let name = null
      if (peek().t === 'ID' && tokens[pos + 1] && tokens[pos + 1].t === 'EQ') {
        name = next().v
        next() // EQ
      }
      const expr = parseExpr()
      stmts.push({ name, expr })
      if (peek().t === 'SEP') {
        next()
        continue
      }
      if (peek().t === 'EOF') break
      throw new Error('Separate multiple outputs with a newline or ;')
    }
    return stmts
  }

  function parseExpr() {
    return parseOr()
  }
  function parseOr() {
    let left = parseXor()
    while (peek().t === 'OR' || peek().t === 'NOR') {
      const op = next().t
      const right = parseXor()
      left = { op: op === 'OR' ? 'or' : 'nor', l: left, r: right }
    }
    return left
  }
  function parseXor() {
    let left = parseAnd()
    while (peek().t === 'XOR') {
      next()
      const right = parseAnd()
      left = { op: 'xor', l: left, r: right }
    }
    return left
  }
  function parseAnd() {
    let left = parseNot()
    while (peek().t === 'AND' || peek().t === 'NAND') {
      const op = next().t
      const right = parseNot()
      left = { op: op === 'AND' ? 'and' : 'nand', l: left, r: right }
    }
    return left
  }
  function parseNot() {
    if (peek().t === 'NOT') {
      next()
      return { op: 'not', c: parseNot() }
    }
    if (peek().t === 'OVERLINE') {
      next()
      expect('LB')
      const inner = parseExpr()
      expect('RB')
      return { op: 'not', c: inner }
    }
    return parsePostfix()
  }
  function parsePostfix() {
    let node = parsePrimary()
    let cnt = 0
    while (peek().t === 'PRIME') {
      next()
      cnt++
    }
    if (cnt % 2 === 1) node = { op: 'not', c: node } // 偶数个 ' 抵消
    return node
  }
  function parsePrimary() {
    const tk = peek()
    if (tk.t === 'LP') {
      next()
      const e = parseExpr()
      expect('RP')
      return e
    }
    if (tk.t === 'ID') {
      next()
      return { op: 'var', name: tk.v }
    }
    throw new Error('Syntax error: unexpected token ' + tk.t)
  }

  const stmts = parseStatements()
  if (peek().t !== 'EOF') throw new Error('Syntax error: unexpected trailing content')
  return stmts
}

function parseExpressionsToCircuit(text) {
  const tokens = tokenize(text)
  const stmts = parse(tokens)

  const nodes = []
  const edges = []
  let seq = 0
  const nid = (p) => exprNextId(p)

  const inputNodes = new Map() // name -> node
  const inputOrder = []

  const IN_X = 40
  const IN_DY = 72
  const COLW = 210
  const BAND = 300 // 不同输出之间的纵向间隔

  const meta = new Map() // 节点 id -> { level, y, stmt }

  function getInput(name) {
    if (inputNodes.has(name)) return inputNodes.get(name)
    const idx = inputOrder.length
    const node = {
      id: nid('in'),
      type: 'io',
      position: { x: IN_X, y: 40 + idx * IN_DY },
      data: { ioType: 'input', label: name, value: false }
    }
    inputNodes.set(name, node)
    inputOrder.push(name)
    nodes.push(node)
    return node
  }

  function build(node, stmt, placed) {
    if (placed.has(node)) return placed.get(node)
    let id
    if (node.op === 'var') {
      const inNode = getInput(node.name)
      meta.set(inNode.id, { level: 0, y: inNode.position.y, stmt })
      id = inNode.id
    } else if (node.op === 'not') {
      const c = build(node.c, stmt, placed)
      id = nid('g')
      nodes.push({ id, type: 'gate', position: { x: 0, y: 0 }, data: { gateType: 'not', gateNum: 'G' + (gateCounter++) } })
      edges.push({ id: nid('e'), source: c, target: id, sourceHandle: 'out', targetHandle: 'in-1' })
      meta.set(id, { level: meta.get(c).level + 1, y: meta.get(c).y, stmt })
    } else {
      const l = build(node.l, stmt, placed)
      const r = build(node.r, stmt, placed)
      id = nid('g')
      nodes.push({ id, type: 'gate', position: { x: 0, y: 0 }, data: { gateType: node.op, gateNum: 'G' + (gateCounter++) } })
      edges.push({ id: nid('e'), source: l, target: id, sourceHandle: 'out', targetHandle: 'in-1' })
      edges.push({ id: nid('e'), source: r, target: id, sourceHandle: 'out', targetHandle: 'in-2' })
      const ml = meta.get(l)
      const mr = meta.get(r)
      meta.set(id, { level: Math.max(ml.level, mr.level) + 1, y: (ml.y + mr.y) / 2, stmt })
    }
    placed.set(node, id)
    return id
  }

  let outIdx = 0
  stmts.forEach((s, si) => {
    const placed = new Map() // 每条输出独立建 gate，便于按带区纵向分隔
    const top = build(s.expr, si, placed)
    const label = s.name || (outIdx < 26 ? String.fromCharCode(88 + outIdx) : 'O' + outIdx)
    outIdx++
    const oid = nid('out')
    const oNode = { id: oid, type: 'io', position: { x: 0, y: 0 }, data: { ioType: 'output', label } }
    nodes.push(oNode)
    edges.push({ id: nid('e'), source: top, target: oid, sourceHandle: 'out', targetHandle: 'in' })
    meta.set(oid, { level: meta.get(top).level + 1, y: meta.get(top).y, stmt: si })
  })

  // 布局：inputs 已定位；gate / output 按 level 定 x，按 y 平均 + 带区偏移定 y
  nodes.forEach((nd) => {
    if (nd.type === 'gate' || (nd.type === 'io' && nd.data.ioType === 'output')) {
      const m = meta.get(nd.id)
      if (m) nd.position = { x: IN_X + m.level * COLW, y: Math.round(m.y + m.stmt * BAND) }
    }
  })

  return { nodes, edges }
}

// 由电路图反向生成表达式文本（供输入框/随机示例回显）。
// 运算符沿用输入框约定：not=^ and=* or=+ xor=# nand=^(a*b) nor=^(a+b)
function circuitToExpression(nodes, edges) {
  const nodeById = new Map(nodes.map((n) => [n.id, n]))
  const incoming = new Map() // target -> [{ source, targetHandle }]
  for (const e of edges) {
    if (!incoming.has(e.target)) incoming.set(e.target, [])
    incoming.get(e.target).push({ source: e.source, targetHandle: e.targetHandle })
  }

  const ATOM = 100 // 输入节点视为原子，不参与加括号
  const PREC = { not: 4, and: 3, nand: 3, xor: 2, or: 1, nor: 1 }

  function childOf(id, handle) {
    const list = incoming.get(id) || []
    if (handle) return list.find((x) => x.targetHandle === handle) || list[0]
    return list[0]
  }

  // 返回 { str, prec }
  function exprOf(id, parentPrec) {
    const n = nodeById.get(id)
    if (!n) return { str: '', prec: 0 }
    if (n.type === 'io' && n.data.ioType === 'input') {
      return { str: String(n.data.label ?? ''), prec: ATOM }
    }
    const g = n.data.gateType
    const ins = incoming.get(id) || []
    if (g === 'not') {
      const c = childOf(id, 'in-1')
      const e = c ? exprOf(c.source, PREC.not) : { str: '', prec: 0 }
      const s = e.prec < PREC.not ? `(${e.str})` : e.str
      return { str: '^' + s, prec: PREC.not }
    }
    if (g === 'and' || g === 'or' || g === 'xor') {
      const sym = g === 'and' ? '*' : g === 'or' ? '+' : '#'
      const l = childOf(id, 'in-1')
      const r = childOf(id, 'in-2')
      const le = l ? exprOf(l.source, PREC[g]) : { str: '', prec: 0 }
      const re = r ? exprOf(r.source, PREC[g]) : { str: '', prec: 0 }
      const ls = le.prec < PREC[g] ? `(${le.str})` : le.str
      const rs = re.prec < PREC[g] ? `(${re.str})` : re.str
      return { str: ls + sym + rs, prec: PREC[g] }
    }
    if (g === 'nand' || g === 'nor') {
      const sym = g === 'nand' ? '*' : '+'
      const l = childOf(id, 'in-1')
      const r = childOf(id, 'in-2')
      const le = l ? exprOf(l.source, PREC.and) : { str: '', prec: 0 }
      const re = r ? exprOf(r.source, PREC.and) : { str: '', prec: 0 }
      const inner = `(${le.str} ${sym} ${re.str})`
      return { str: '^' + inner, prec: PREC.not }
    }
    return { str: '', prec: 0 }
  }

  const outs = nodes.filter((n) => n.type === 'io' && n.data.ioType === 'output')
  const lines = outs.map((o) => {
    const c = childOf(o.id, 'in')
    const e = c ? exprOf(c.source, 0) : { str: '', prec: 0 }
    return `${o.data.label} = ${e.str}`
  })
  return lines.join('\n')
}

/* =====================================================================
 * 原 GateNode.vue —— 门节点（用 render 函数内联）
 * ===================================================================== */
const GateNode = defineComponent({
  name: 'GateNode',
  props: { data: { type: Object, required: true }, id: { type: String, required: true } },
  setup(props) {
    const onCtx = inject('onNodeContextMenu', null)
    const twoInputs = ['and', 'or', 'xor', 'nand', 'nor'].includes(props.data.gateType)
    return () => {
      const handles = []
      if (twoInputs) {
        handles.push(h(Handle, { id: 'in-1', type: 'target', position: Position.Left, style: { top: '30%' } }))
        handles.push(h(Handle, { id: 'in-2', type: 'target', position: Position.Left, style: { top: '70%' } }))
      } else {
        handles.push(h(Handle, { id: 'in-1', type: 'target', position: Position.Left, style: { top: '50%' } }))
      }
      handles.push(h(Handle, { id: 'out', type: 'source', position: Position.Right, style: { top: '50%' } }))
      handles.push(h('svg', { viewBox: '0 0 160 100', class: 'gate-svg', innerHTML: gateSvg(props.data.gateType) }))
      if (props.data.gateNum) {
        handles.push(h('div', { class: 'gate-num' }, props.data.gateNum))
      }
      return h(
        'div',
        { class: 'gate-node', onContextmenu: (e) => { e.preventDefault(); e.stopPropagation(); if (onCtx) onCtx(props.id, e) } },
        handles
      )
    }
  }
})
const nodeTypes = { gate: markRaw(GateNode), io: undefined } // io 在下方覆盖

/* =====================================================================
 * 原 IoNode.vue —— 输入/输出节点（用 render 函数内联）
 * ===================================================================== */
const IoNode = defineComponent({
  name: 'IoNode',
  props: { data: { type: Object, required: true }, id: { type: String, required: true } },
  setup(props) {
    const outputState = inject('outputState', null)
    const val = computed(() => (outputState && props.id != null ? outputState[props.id] : 0))
    const onCtx = inject('onNodeContextMenu', null)
    return () => {
      const isIn = props.data.ioType === 'input'
      const cls = ['io-node', props.data.ioType]
      if (!isIn && val.value) cls.push('on')
      const children = []
      if (isIn) children.push(h(Handle, { id: 'out', type: 'source', position: Position.Right }))
      else children.push(h(Handle, { id: 'in', type: 'target', position: Position.Left }))
      if (isIn) {
        children.push(
          h('input', {
            type: 'checkbox',
            checked: props.data.value,
            onChange: (e) => (props.data.value = e.target.checked)
          })
        )
      }
      children.push(h('span', props.data.label))
      return h(
        'div',
        { class: cls, onContextmenu: (e) => { e.preventDefault(); e.stopPropagation(); if (onCtx) onCtx(props.id, e) } },
        children
      )
    }
  }
})
nodeTypes.io = markRaw(IoNode)

/* =====================================================================
 * 原 App.vue 逻辑
 * ===================================================================== */
const {
  addNodes,
  addEdges,
  removeNodes,
  removeEdges,
  getNodes,
  getEdges,
  onConnect,
  onNodeDrag,
  onNodeDragStop,
  onNodesChange,
  onEdgesChange,
  screenToFlowCoordinate,
  fitView,
  setNodes,
  setEdges
} = useVueFlow()

let seq = 0
const nextId = (p) => `${p}-${seq++}`

// 表达式→电路重建专用：全局唯一 id，避免多次重建产生重复 node id 导致 Vue Flow 合并/竞态
const exprSeqMgr = { seq: 0 }
function exprNextId(p) { return `${p}-b${exprSeqMgr.seq++}` }

// 拖拽 gate 的数字编号（G1, G2...）
let gateCounter = 1

const isInput = (n) => n.type === 'io' && n.data.ioType === 'input'
const isOutput = (n) => n.type === 'io' && n.data.ioType === 'output'

function addInput() {
  const i = getNodes.value.filter(isInput).length
  addNodes([
    {
      id: nextId('in'),
      type: 'io',
      position: { x: -20, y: 60 + i * 110 },
      data: { ioType: 'input', label: String.fromCharCode(65 + i), value: false }
    }
  ])
}
function addOutput() {
  const i = getNodes.value.filter(isOutput).length
  addNodes([
    {
      id: nextId('out'),
      type: 'io',
      position: { x: 560, y: 60 + i * 110 },
      // 第一个输出默认名 X，第二个起 X1、X2...
      data: { ioType: 'output', label: i === 0 ? 'X' : 'X' + i }
    }
  ])
}
function removeNode(id) {
  const es = getEdges.value.filter((e) => e.source === id || e.target === id).map((e) => e.id)
  if (es.length) removeEdges(es)
  removeNodes([id])
  syncExpr()
}
function removeInput() {
  const ins = getNodes.value.filter(isInput)
  if (ins.length > 1) removeNode(ins[ins.length - 1].id)
}
function removeOutput() {
  const outs = getNodes.value.filter(isOutput)
  if (outs.length > 1) removeNode(outs[outs.length - 1].id)
}

const inputCount = computed(() => getNodes.value.filter(isInput).length)
const outputCount = computed(() => getNodes.value.filter(isOutput).length)

onConnect((params) => {
  addEdges([{ ...params, type: 'smoothstep', markerEnd: MarkerType.ArrowClosed }])
  syncExpr()
})

// 监听 Vue Flow 内部的删除（如 Delete/Backspace 删除选中节点/连线），同步回表达式输入框
onNodesChange((changes) => {
  if (changes.some((c) => c.type === 'remove')) syncExpr()
})
onEdgesChange((changes) => {
  if (changes.some((c) => c.type === 'remove')) syncExpr()
})

// 把节点拖到左侧 sidebar 时从画布删除
const sidebarEl = ref(null)

// 全局追踪指针位置，作为最可靠的 clientX/clientY 来源
const pointer = reactive({ x: 0, y: 0 })
function onPointerMove(e) {
  pointer.x = e.clientX
  pointer.y = e.clientY
}

function resolveDrag(payload) {
  const node = payload && payload.node ? payload.node : payload
  const ev = payload && payload.event
  const x = ev && typeof ev.clientX === 'number' ? ev.clientX : pointer.x
  const y = ev && typeof ev.clientY === 'number' ? ev.clientY : pointer.y
  return { node, x, y }
}
function isOverSidebar(x, y) {
  const el = sidebarEl.value?.$el || sidebarEl.value
  if (!el) return false
  const r = el.getBoundingClientRect()
  return x >= r.left && x <= r.right && y >= r.top && y <= r.bottom
}
function deleteIfOverSidebar(payload) {
  const { node, x, y } = resolveDrag(payload)
  if (!node) return
  if (isOverSidebar(x, y)) {
    try {
      removeNode(node.id)
    } catch (e) {
      /* 拖动中删除的偶发异常忽略，落到 onNodeDragStop 再处理 */
    }
  }
}
function onDragStop(payload) {
  deleteIfOverSidebar(payload)
  syncExpr()
}
onNodeDrag(deleteIfOverSidebar)
onNodeDragStop(onDragStop)

function onDragOver(e) {
  e.preventDefault()
  e.dataTransfer.dropEffect = 'move'
}
function onDrop(e) {
  e.preventDefault()
  const type = e.dataTransfer.getData('application/vueflow')
  if (!type) return
  const pos = screenToFlowCoordinate({ x: e.clientX, y: e.clientY })
  addNodes([{ id: nextId('g'), type: 'gate', position: pos, data: { gateType: type, gateNum: 'G' + (gateCounter++) } }])
}

// 实时求值（顶部表达式 + 真值表共用）
const live = computed(() => evaluateCircuit(getNodes.value, getEdges.value))

// 把每个输出节点的实时值同步到一个独立 reactive map，供输出节点组件着色
const outputState = reactive({})
provide('outputState', outputState)

// 当前电路对应的表达式文本
const circuitExpr = ref('')
provide('circuitExpr', circuitExpr)
function syncExpr() {
  const next = circuitToExpression(getNodes.value, getEdges.value)
  if (next !== circuitExpr.value) circuitExpr.value = next
}
watch(
  live,
  (res) => {
    res.outputs.forEach((o) => {
      outputState[o.id] = o.value
    })
    // 高电平(True)连线 → 流水式绿色虚线；其余 → 默认样式
    const nv = res.nodeValues
    getEdges.value.forEach((ed) => {
      const high = ed.source in nv ? !!nv[ed.source] : false
      const cls = high ? 'edge-high' : 'edge-low'
      if (ed.class !== cls) ed.class = cls
    })
  },
  { immediate: true }
)

/* ---------- 右键菜单：删除 / 剪切 / 复制 / 粘贴 ---------- */
const clipboard = ref(null)
const contextMenu = ref({ show: false, x: 0, y: 0, nodeId: null, mode: 'node' })
const canvasWrap = ref(null)

provide('onNodeContextMenu', handleNodeContextMenu)

function closeMenu() {
  contextMenu.value = { ...contextMenu.value, show: false }
}
function handleNodeContextMenu(id, event) {
  event.preventDefault()
  event.stopPropagation()
  contextMenu.value = { show: true, x: event.clientX, y: event.clientY, nodeId: id, mode: 'node' }
}
function handlePaneContextMenu(event) {
  event.preventDefault()
  event.stopPropagation()
  contextMenu.value = { show: true, x: event.clientX, y: event.clientY, nodeId: null, mode: 'pane' }
}
function ctxDelete() {
  const id = contextMenu.value.nodeId
  if (id) removeNode(id)
  closeMenu()
}
function ctxCopy() {
  const id = contextMenu.value.nodeId
  const n = getNodes.value.find((x) => x.id === id)
  if (n) clipboard.value = { type: n.type, data: JSON.parse(JSON.stringify(n.data)) }
  closeMenu()
}
function ctxCut() {
  ctxCopy()
  ctxDelete()
}
function pasteAt(flowPos) {
  if (!clipboard.value) return
  const id = nextId('g')
  const t = clipboard.value
  addNodes([
    {
      id,
      type: t.type,
      position: { x: flowPos.x + 28, y: flowPos.y + 28 },
      data: JSON.parse(JSON.stringify(t.data))
    }
  ])
  closeMenu()
}
function ctxPaste() {
  pasteAt(screenToFlowCoordinate({ x: contextMenu.value.x, y: contextMenu.value.y }))
}
function onKey(e) {
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'v') {
    const tag = (e.target.tagName || '').toUpperCase()
    if (tag === 'INPUT' || tag === 'TEXTAREA') return
    const rect = canvasWrap.value?.getBoundingClientRect()
    const cx = rect ? rect.left + rect.width / 2 : window.innerWidth / 2
    const cy = rect ? rect.top + rect.height / 2 : window.innerHeight / 2
    pasteAt(screenToFlowCoordinate({ x: cx, y: cy }))
  }
}

const expressions = computed(() =>
  live.value.outputs.map((o) => ({
    label: o.label,
    html: katex.renderToString(o.tex || '0', { throwOnError: false })
  }))
)

const MAX_ROWS = 1 << 10
const truthTable = computed(() => {
  const ins = getNodes.value.filter(isInput)
  const n = ins.length
  const total = Math.min(1 << n, MAX_ROWS)
  // 参与展示的 gate：仅含编号的（用户拖出的），按画布顺序
  const gates = getNodes.value.filter((n) => n.type === 'gate')
  const gateLabels = gates.map((g) => g.data.gateNum || '')
  const rows = []
  for (let m = 0; m < total; m++) {
    const override = {}
    ins.forEach((node, i) => (override[node.id] = (m >> i) & 1))
    const { outputs, nodeValues } = evaluateCircuit(getNodes.value, getEdges.value, override)
    rows.push({
      ins: ins.map((_, i) => (m >> i) & 1),
      gates: gates.map((g) => (g.id in nodeValues ? nodeValues[g.id] : 0)),
      outs: outputs.map((o) => o.value)
    })
  }
  return {
    inputLabels: ins.map((n) => n.data.label),
    gateLabels,
    outputLabels: live.value.outputs.map((o) => o.label),
    rows,
    capped: 1 << n > MAX_ROWS
  }
})

onMounted(async () => {
  // 全局关闭菜单 / 粘贴快捷键（仅在客户端挂载后注册，避免 SSR 时 window 未定义）
  window.addEventListener('pointermove', onPointerMove)
  window.addEventListener('click', closeMenu)
  window.addEventListener('contextmenu', closeMenu)
  window.addEventListener('keydown', onKey)
  addInput()
  addInput()
  addOutput()
  await nextTick()
  fitView()
})

onBeforeUnmount(() => {
  window.removeEventListener('click', closeMenu)
  window.removeEventListener('contextmenu', closeMenu)
  window.removeEventListener('keydown', onKey)
  window.removeEventListener('pointermove', onPointerMove)
})

/* ---------- 导入 / 导出 JSON ---------- */
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
    nodes: getNodes.value.map((n) => ({
      id: n.id,
      type: n.type,
      position: { x: n.position.x, y: n.position.y },
      data: n.data
    })),
    edges: getEdges.value.map((e) => ({
      id: e.id,
      source: e.source,
      target: e.target,
      sourceHandle: e.sourceHandle,
      targetHandle: e.targetHandle
    }))
  }
  downloadBlob(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }), 'circuit.json')
}

const showTruth = ref(false)
const fileInput = ref(null)
function triggerImport() {
  fileInput.value?.click()
}
function importJson(e) {
  const file = e.target.files?.[0]
  if (!file) return
  const reader = new FileReader()
  reader.onload = () => {
    try {
      const data = JSON.parse(String(reader.result))
      setNodes((data.nodes || []).map((n) => ({ ...n, position: { ...n.position } })))
      setEdges(
        (data.edges || []).map((ed) => ({
          ...ed,
          type: 'smoothstep',
          markerEnd: MarkerType.ArrowClosed
        }))
      )
      nextTick(fitView)
      circuitExpr.value = circuitToExpression(getNodes.value, getEdges.value)
    } catch (err) {
      alert('JSON parse failed: ' + err.message)
    }
  }
  reader.readAsText(file)
  e.target.value = ''
}

function clearAll() {
  // 只清空 gate 与连线，保留输入 / 输出节点（不改变其数量）
  const ios = getNodes.value.filter((n) => n.type === 'io')
  setNodes(ios)
  setEdges([])
  circuitExpr.value = ''
}

// 由左侧表达式输入框生成电路
async function buildFromExpr(text) {
  const trimmed = (text || '').trim()
  if (!trimmed) return
  try {
    const { nodes, edges } = parseExpressionsToCircuit(trimmed)
    // 彻底重载画布：先清空所有节点/连线，再重建，避免 Vue Flow 对同 id 增量合并导致旧 handle/边残留
    setNodes([])
    setEdges([])
    await nextTick()
    setNodes(nodes)
    setEdges(edges.map((e) => ({ ...e, type: 'smoothstep', markerEnd: MarkerType.ArrowClosed })))
    await nextTick()
    fitView()
  } catch (err) {
    console.error('Expression parse failed:', err.message)
  }
}

// 随机生成一个合法的布尔表达式字符串
function randInt(n) {
  return Math.floor(Math.random() * n)
}
function genRandomExpr() {
  const nVars = 2 + randInt(3) // 2..4 个变量
  const vars = []
  for (let i = 0; i < nVars; i++) vars.push(String.fromCharCode(65 + i)) // A,B,C,D
  const binOps = [
    (a, b) => `(${a})*(${b})`,
    (a, b) => `(${a})+(${b})`,
    (a, b) => `(${a})#(${b})`,
    (a, b) => `^(${a}*${b})`,
    (a, b) => `^(${a}+${b})`
  ]
  function gen(depth) {
    const r = Math.random()
    if (depth <= 0 || r < 0.35) return vars[randInt(vars.length)]
    if (r < 0.5) return `^(${gen(depth - 1)})`
    const op = binOps[randInt(binOps.length)]
    return op(gen(depth - 1), gen(depth - 1))
  }
  return `X = ${gen(2 + randInt(2))}`
}

async function generateRandom() {
  const exprText = genRandomExpr()
  try {
    const { nodes, edges } = parseExpressionsToCircuit(exprText)
    // 同样彻底重载画布，避免残留
    setNodes([])
    setEdges([])
    await nextTick()
    setNodes(nodes)
    setEdges(edges.map((e) => ({ ...e, type: 'smoothstep', markerEnd: MarkerType.ArrowClosed })))
    await nextTick()
    fitView()
    circuitExpr.value = circuitToExpression(getNodes.value, getEdges.value)
  } catch (err) {
    console.error('Random example generation failed:', err.message)
  }
}

/* ---------- 导出透明 PNG ---------- */
function nodeSize(node) {
  const w = node.dimensions?.width || (node.type === 'io' ? 70 : 90)
  const h = node.dimensions?.height || (node.type === 'io' ? 40 : 60)
  return { w, h }
}
function handlePoint(node, handleId, which) {
  const { w, h } = nodeSize(node)
  const x = node.position.x
  const y = node.position.y
  if (node.type === 'io') {
    return node.data.ioType === 'input'
      ? { x: x + w, y: y + h / 2 }
      : { x: x, y: y + h / 2 }
  }
  if (which === 'source') return { x: x + w, y: y + h / 2 }
  if (handleId === 'in-2') return { x: x, y: y + 0.7 * h }
  return { x: x, y: y + (node.data.gateType === 'not' ? 0.5 : 0.3) * h }
}

function buildSvg() {
  const nodes = getNodes.value
  const edges = getEdges.value
  const nodeMap = new Map(nodes.map((n) => [n.id, n]))

  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity
  nodes.forEach((n) => {
    const { w, h } = nodeSize(n)
    minX = Math.min(minX, n.position.x)
    minY = Math.min(minY, n.position.y)
    maxX = Math.max(maxX, n.position.x + w)
    maxY = Math.max(maxY, n.position.y + h)
  })
  if (!isFinite(minX)) {
    minX = 0; minY = 0; maxX = 100; maxY = 100
  }
  const pad = 40
  const vbX = minX - pad
  const vbY = minY - pad
  const vbW = maxX - minX + pad * 2
  const vbH = maxY - minY + pad * 2

  const parts = []

  // 连线
  edges.forEach((e) => {
    const s = nodeMap.get(e.source)
    const t = nodeMap.get(e.target)
    if (!s || !t) return
    const p1 = handlePoint(s, e.sourceHandle, 'source')
    const p2 = handlePoint(t, e.targetHandle, 'target')
    const mx = (p1.x + p2.x) / 2
    parts.push(
      `<path d="M ${p1.x} ${p1.y} C ${mx} ${p1.y}, ${mx} ${p2.y}, ${p2.x} ${p2.y}" fill="none" stroke="#475569" stroke-width="2"/>`
    )
    parts.push(`<circle cx="${p2.x}" cy="${p2.y}" r="2.5" fill="#475569"/>`)
  })

  // 节点
  let outIdx = 0
  nodes.forEach((n) => {
    const { w, h } = nodeSize(n)
    const x = n.position.x
    const y = n.position.y
    if (n.type === 'gate') {
      parts.push(
        `<g transform="translate(${x},${y})"><svg x="0" y="0" width="${w}" height="${h}" viewBox="0 0 160 100">${gateSvg(
          n.data.gateType
        )}</svg></g>`
      )
    } else {
      // PNG 导出：左右节点只显示字母，不要数值和边框
      const label =
        n.data.ioType === 'output'
          ? String.fromCharCode(88 + outIdx++) // X, Y, Z ...
          : n.data.label // A, B, C ...
      parts.push(
        `<g transform="translate(${x},${y})">` +
          `<text x="${w / 2}" y="${h / 2 + 5}" text-anchor="middle" font-size="14" font-family="sans-serif" font-weight="600" fill="#111827">${label}</text>` +
          `</g>`
      )
    }
  })

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${vbW}" height="${vbH}" viewBox="${vbX} ${vbY} ${vbW} ${vbH}">${parts.join(
    ''
  )}</svg>`
}

function exportPng() {
  const svg = buildSvg()
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
    canvas.toBlob((b) => {
      if (b) downloadBlob(b, 'circuit.png')
    }, 'image/png')
  }
  img.onerror = (err) => {
    console.error('PNG export failed: SVG render error', err)
    URL.revokeObjectURL(url)
  }
  img.src = url
}

/* =====================================================================
 * 原 Sidebar.vue 逻辑（模板已内联到下方）
 * ===================================================================== */
const text = ref('')
const error = ref('')
let timer = null

// 由 App 注入：当前电路对应的表达式文本
watch(circuitExpr, (v) => {
  if (v != null && v !== text.value) text.value = v
})

function validate() {
  const t = text.value.trim()
  if (!t) {
    error.value = ''
    return true
  }
  try {
    parseExpressionsToCircuit(t)
    error.value = ''
    return true
  } catch (e) {
    error.value = e.message
    return false
  }
}

// 输入即实时生成（防抖）；仅当表达式合法才替换画布
function onSidebarInput() {
  clearTimeout(timer)
  timer = setTimeout(() => {
    if (validate()) buildFromExpr(text.value)
  }, 400)
}

// Ctrl/Cmd + Enter 也可立即生成
function onSidebarKeydown(e) {
  if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
    e.preventDefault()
    if (validate()) buildFromExpr(text.value)
  }
}

function onDragStart(e, type) {
  e.dataTransfer.setData('application/vueflow', type)
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
</script>

<template>
  <div class="app">
    <header class="topbar">
      <div class="topbar-left">
        <h1>Logic Circuit Designer</h1>
        <div class="exprs">
          <div v-for="e in expressions" :key="e.label" class="expr">
            <span class="expr-label">{{ e.label }} =</span>
            <span class="expr-tex" v-html="e.html"></span>
          </div>
          <span v-if="!expressions.length" class="expr-label">No output node yet</span>
        </div>
      </div>

      <div class="io-steppers">
        <div class="stepper">
          <span class="stepper-label">Inputs</span>
          <button @click="removeInput">−</button>
          <span class="stepper-val">{{ inputCount }}</span>
          <button @click="addInput">+</button>
        </div>
        <div class="stepper">
          <span class="stepper-label">Outputs</span>
          <button @click="removeOutput">−</button>
          <span class="stepper-val">{{ outputCount }}</span>
          <button @click="addOutput">+</button>
        </div>
      </div>

      <div class="toolbar">
        <button class="tb-random" @click="generateRandom">Random</button>
        <button class="tb-truth" @click="showTruth = !showTruth">Truth Table</button>
        <button class="tb-import" @click="triggerImport">Import JSON</button>
        <button class="tb-json" @click="exportJson">Export JSON</button>
        <button class="tb-png" @click="exportPng">Export PNG</button>
        <button class="tb-clear" @click="clearAll">Clear</button>
        <input ref="fileInput" type="file" accept="application/json" hidden @change="importJson" />
      </div>
    </header>

    <div class="main">
      <!-- Sidebar（内联） -->
      <aside ref="sidebarEl" class="sidebar">
        <div class="panel">
          <div class="gate-head">
            <h3>Logic Gates (drag to canvas)</h3>
            <button class="help-btn" type="button" aria-label="How to use" tabindex="0">?</button>
            <div class="help-pop" role="tooltip">
              Drag a gate into the canvas, then drag between ports to connect them.<br />
              Select a node and press Delete / Backspace to remove it.
            </div>
          </div>
          <div class="gate-list">
            <div
              v-for="g in GATES"
              :key="g.type"
              class="gate-item"
              draggable="true"
              :title="g.label"
              @dragstart="onDragStart($event, g.type)"
            >
              <svg viewBox="0 0 160 100" class="gate-preview" v-html="gateSvg(g.type)"></svg>
            </div>
          </div>
        </div>

        <div class="expr-gen">
          <div class="expr-head">
            <label>Expression &rarr; Circuit</label>
            <button class="help-btn" type="button" aria-label="Syntax reference" tabindex="0">?</button>
            <div class="help-pop" role="tooltip">
              <b>Syntax</b>
              <div>not: ^</div>
              <div>and: *</div>
              <div>or: +</div>
              <div>xor: #</div>
              <div>nand: ^(a*b)</div>
              <div>nor: ^(a+b)</div>
              <div class="help-note">Word operators also work: and / or / not / xor (case-insensitive)</div>
            </div>
          </div>
          <textarea
            v-model="text"
            class="expr-input"
            :class="{ err: error }"
            rows="3"
            spellcheck="false"
            placeholder="e.g. X = A*B + ^C"
            @input="onSidebarInput"
            @keydown="onSidebarKeydown"
          ></textarea>
          <p v-if="error" class="expr-err">{{ error }}</p>
        </div>
      </aside>

      <div
        ref="canvasWrap"
        class="canvas-wrap"
        @drop="onDrop"
        @dragover="onDragOver"
        @contextmenu="handlePaneContextMenu"
      >
        <VueFlow
          :node-types="nodeTypes"
          :delete-key-code="['Delete', 'Backspace']"
          :auto-pan-on-node-drag="false"
          :default-edge-options="{ type: 'smoothstep', markerEnd: MarkerType.ArrowClosed }"
          :fit-view-on-init="true"
        >
          <Background :gap="16" />
          <Controls />
        </VueFlow>
      </div>
    </div>

    <transition name="truth-fade">
      <div v-if="showTruth" class="truth-modal" @click.self="showTruth = false">
        <div class="truth-panel truth">
          <div class="truth-head">
            <h3>
              Truth Table
              <small v-if="truthTable.capped">(too many inputs, truncated to {{ MAX_ROWS }} rows)</small>
            </h3>
            <button class="close" @click="showTruth = false">×</button>
          </div>
          <div class="truth-exprs">
            <div v-for="e in expressions" :key="e.label" class="expr">
              <span class="expr-label">{{ e.label }} =</span>
              <span class="expr-tex" v-html="e.html"></span>
            </div>
          </div>
          <div class="truth-body">
            <table>
              <thead>
                <tr>
                  <th v-for="l in truthTable.inputLabels" :key="'i' + l">{{ l }}</th>
                  <th v-for="(l, gi) in truthTable.gateLabels" :key="'g' + gi" class="gate-th">{{ l || ('G' + (gi + 1)) }}</th>
                  <th v-for="l in truthTable.outputLabels" :key="'o' + l">{{ l }}</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="(r, idx) in truthTable.rows" :key="idx">
                  <td v-for="(v, i) in r.ins" :key="'i' + i">{{ v }}</td>
                  <td v-for="(v, i) in r.gates" :key="'g' + i" :class="{ hl: v }">{{ v }}</td>
                  <td v-for="(v, i) in r.outs" :key="'o' + i" :class="{ hl: v }">{{ v }}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </transition>

    <transition name="truth-fade">
      <div
        v-if="contextMenu.show"
        class="ctx-menu"
        :style="{ left: contextMenu.x + 'px', top: contextMenu.y + 'px' }"
      >
        <template v-if="contextMenu.mode === 'node'">
          <button @click="ctxCopy">Copy</button>
          <button @click="ctxCut">Cut</button>
          <button class="danger" @click="ctxDelete">Delete</button>
        </template>
        <template v-else>
          <button :disabled="!clipboard" @click="ctxPaste">Paste</button>
        </template>
      </div>
    </transition>
  </div>
</template>

<style>
/* 原生 style.css 全局样式（合并） */
* { box-sizing: border-box; }
/* 高电平连线：流水式绿色虚线 */
.vue-flow__edge.edge-high .vue-flow__edge-path,
.vue-flow__edge.edge-high .vue-flow__connection-path {
  stroke: #22c55e !important;
  stroke-width: 2;
  stroke-dasharray: 8 6;
  animation: logic-flow-dash 0.7s linear infinite;
}
@keyframes logic-flow-dash {
  to { stroke-dashoffset: -14; }
}
/* 低电平连线：默认灰色 */
.vue-flow__edge.edge-low .vue-flow__edge-path {
  stroke: #475569 !important;
}
html, body, #app { height: 100%; margin: 0; }
body {
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif;
  color: #1f2937;
}

.app { display: flex; flex-direction: column; height: 100vh; }

/* 顶部表达式栏 */
.topbar {
  padding: 10px 16px;
  background: #0f172a;
  color: #fff;
  display: flex;
  align-items: center;
  gap: 16px;
  justify-content: space-between;
  flex-wrap: wrap;
}
.topbar-left { display: flex; align-items: center; gap: 20px; min-width: 0; }
.topbar h1 { font-size: 16px; margin: 0; white-space: nowrap; }
.exprs { display: flex; gap: 18px; flex-wrap: wrap; align-items: center; }
.expr { display: flex; align-items: center; gap: 6px; font-size: 15px; }
.expr-label { color: #93c5fd; font-weight: 600; white-space: nowrap; }

/* 顶部工具栏 */
.io-steppers { display: flex; gap: 12px; align-items: center; }
.stepper {
  display: flex; align-items: center; gap: 6px;
  background: #1e293b; border: 1px solid #334155; border-radius: 6px; padding: 3px 8px;
}
.stepper-label { color: #93c5fd; font-size: 12px; }
.stepper-val { color: #e2e8f0; min-width: 14px; text-align: center; font-weight: 600; }
.stepper button {
  width: 22px; height: 22px; border-radius: 4px; border: 1px solid #334155;
  background: #0f172a; color: #e2e8f0; cursor: pointer; font-size: 14px; line-height: 1;
}
.stepper button:hover { background: #334155; }

.toolbar { display: flex; gap: 8px; }
.toolbar button {
  color: #fff;
  border: none;
  border-radius: 6px;
  padding: 6px 14px;
  font-size: 12.5px;
  font-weight: 600;
  cursor: pointer;
  white-space: nowrap;
}
.toolbar .tb-truth { background: #0ea5e9; }
.toolbar .tb-truth:hover { background: #0284c7; }
.toolbar .tb-import { background: #8b5cf6; }
.toolbar .tb-import:hover { background: #7c3aed; }
.toolbar .tb-json { background: #10b981; }
.toolbar .tb-json:hover { background: #059669; }
.toolbar .tb-png { background: #f59e0b; }
.toolbar .tb-png:hover { background: #d97706; }
.toolbar .tb-clear { background: #ef4444; }
.toolbar .tb-clear:hover { background: #dc2626; }
.toolbar .tb-random { background: #6366f1; }
.toolbar .tb-random:hover { background: #4f46e5; }

/* 主区域 */
.main { display: flex; flex: 1; min-height: 0; }
.sidebar {
  width: 210px;
  background: #fff;
  border-right: 1px solid #e5e7eb;
  padding: 14px;
  overflow: auto;
  flex-shrink: 0;
}
.canvas-wrap { flex: 1; position: relative; min-width: 0; }

/* 侧边栏面板 */
.panel { margin-bottom: 18px; }
.panel h3 { font-size: 13px; margin: 0 0 8px; color: #374151; text-transform: uppercase; letter-spacing: .04em; }
.gate-list { display: flex; flex-direction: column; gap: 8px; }
.gate-item {
  padding: 6px;
  background: #f8fafc;
  border: 1px solid #cbd5e1;
  border-radius: 6px;
  cursor: grab;
  display: flex;
  justify-content: center;
  align-items: center;
  user-select: none;
}
.gate-item:hover { background: #e2e8f0; border-color: #94a3b8; }
.gate-item:active { cursor: grabbing; }
.gate-preview { width: 100%; height: 46px; display: block; }
.io-controls { display: flex; align-items: center; gap: 10px; }
.io-controls button {
  width: 30px; height: 30px; border-radius: 6px; border: 1px solid #cbd5e1;
  background: #f8fafc; cursor: pointer; font-size: 18px; line-height: 1;
}
.io-controls button:hover { background: #e2e8f0; }
.io-controls span { min-width: 18px; text-align: center; font-weight: 600; }

/* 节点样式 */
.gate-node { width: 90px; position: relative; }
.gate-num {
  position: absolute; top: -16px; left: 50%; transform: translateX(-50%); z-index: 5;
  background: transparent; color: #6366f1; font-size: 11px; font-weight: 700;
  line-height: 1.3; pointer-events: none; white-space: nowrap;
}
.gate-svg { width: 100%; height: auto; display: block; background: #fff; border-radius: 6px; }
.io-node {
  display: flex; align-items: center; gap: 6px;
  background: #fff; border: 2px solid #6366f1; border-radius: 8px;
  padding: 6px 10px; font-size: 13px; font-weight: 600;
}
.io-node.output { border-color: #cbd5e1; background: #f8fafc; color: #475569; }
.io-node.output.on { border-color: #10b981; background: #dcfce7; color: #166534; }

/* 选中节点边框 */
.vue-flow__node.selected .gate-node { outline: 2px solid #3b82f6; outline-offset: 3px; border-radius: 6px; }
.vue-flow__node.selected .io-node { border-color: #3b82f6; box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.35); }

/* 右键上下文菜单 */
.ctx-menu {
  position: fixed;
  z-index: 60;
  min-width: 132px;
  background: #fff;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.18);
  padding: 4px;
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.ctx-menu button {
  text-align: left;
  border: none;
  background: transparent;
  padding: 7px 12px;
  border-radius: 6px;
  font-size: 13px;
  cursor: pointer;
  color: #1f2937;
}
.ctx-menu button:hover:not(:disabled) { background: #f1f5f9; }
.ctx-menu button.danger { color: #dc2626; }
.ctx-menu button.danger:hover:not(:disabled) { background: #fef2f2; }
.ctx-menu button:disabled { opacity: 0.4; cursor: not-allowed; }
.io-node input[type="checkbox"] { width: 15px; height: 15px; }

/* 真值表弹窗 */
.truth-modal {
  position: fixed;
  inset: 0;
  z-index: 50;
  background: rgba(15, 23, 42, 0.45);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
}
.truth-panel {
  background: #fff;
  border-radius: 12px;
  width: min(92vw, 760px);
  max-height: 86vh;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
}
.truth-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  border-bottom: 1px solid #e5e7eb;
}
.truth-head .close {
  border: none;
  background: #f1f5f9;
  border-radius: 6px;
  width: 28px;
  height: 28px;
  font-size: 18px;
  cursor: pointer;
  line-height: 1;
  color: #475569;
}
.truth-head .close:hover { background: #e2e8f0; }
.truth-exprs {
  display: flex;
  flex-wrap: wrap;
  gap: 16px;
  padding: 10px 16px;
  border-bottom: 1px solid #e5e7eb;
  background: #f8fafc;
}
.truth-body { overflow: auto; padding: 12px 16px; min-height: 0; }
.truth-fade-enter-active, .truth-fade-leave-active { transition: opacity 0.15s ease; }
.truth-fade-enter-from, .truth-fade-leave-to { opacity: 0; }

.truth h3 { font-size: 13px; margin: 0; color: #374151; }
.truth h3 small { color: #9ca3af; font-weight: 400; }
.truth table { border-collapse: collapse; font-size: 12.5px; margin: 0 auto; }
.truth th, .truth td { border: 1px solid #d1d5db; padding: 3px 9px; text-align: center; }
.truth th { background: #eef2ff; color: #3730a3; }
.truth th.gate-th { background: #f3e8ff; color: #7e22ce; }
.truth tbody td.hl { background: #dcfce7; color: #166534; font-weight: 600; }

/* 原 GateNode.vue 使用的样式（已并入上方） */

/* 原 Sidebar.vue 的 scoped 样式（合并） */
.expr-gen {
  position: relative;
  margin-top: 14px;
  padding: 10px;
  border: 1px solid #e5e7eb;
  border-radius: 10px;
  background: #f9fafb;
}
.gate-head {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8px;
}
.gate-head h3 { margin: 0; }
.expr-head {
  position: relative;
  display: flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 6px;
}
.expr-head label {
  font-size: 12px;
  font-weight: 600;
  color: #374151;
}
.help-btn {
  width: 18px;
  height: 18px;
  line-height: 16px;
  padding: 0;
  text-align: center;
  border-radius: 50%;
  border: 1px solid #c7cdd6;
  background: #fff;
  color: #6366f1;
  font-size: 12px;
  font-weight: 700;
  cursor: help;
}
.help-pop {
  position: absolute;
  top: 24px;
  right: 0;
  left: auto;
  z-index: 50;
  width: 180px;
  padding: 10px 12px;
  background: #111827;
  color: #f3f4f6;
  border-radius: 8px;
  font-size: 11px;
  line-height: 1.7;
  box-shadow: 0 6px 18px rgba(0, 0, 0, 0.25);
  opacity: 0;
  visibility: hidden;
  transform: translateY(4px);
  transition: opacity 0.12s ease, transform 0.12s ease;
  pointer-events: none;
}
.help-btn:hover + .help-pop,
.help-btn:focus + .help-pop {
  opacity: 1;
  visibility: visible;
  transform: translateY(0);
}
.help-pop b {
  color: #fff;
}
.help-note {
  margin-top: 2px;
  color: #c7d2fe;
}
.expr-input {
  width: 100%;
  box-sizing: border-box;
  resize: vertical;
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  font-size: 12px;
  line-height: 1.5;
  padding: 8px;
  border: 1px solid #d1d5db;
  border-radius: 8px;
  background: #fff;
  color: #111827;
}
.expr-input:focus {
  outline: none;
  border-color: #6366f1;
  box-shadow: 0 0 0 2px rgba(99, 102, 241, 0.2);
}
.expr-input.err {
  border-color: #ef4444;
  box-shadow: 0 0 0 2px rgba(239, 68, 68, 0.2);
}
.expr-err {
  margin: 6px 0 0;
  font-size: 11px;
  color: #ef4444;
}
</style>