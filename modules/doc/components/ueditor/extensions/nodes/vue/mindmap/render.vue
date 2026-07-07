<template>
    <div class="mindmap-render-wrapper">
        <div ref="mindmapRef" class="mindmap-render-preview" :style="{ height: dynamicHeight + 'px', width: dynamicWidth }" />
    </div>
</template>

<script setup>
const props = defineProps({
    node: Object,
})

const SMM_CSS = 'https://unpkg.com/simple-mind-map@0.10.2/dist/simpleMindMap.esm.css'
const SMM_JS = 'https://unpkg.com/simple-mind-map@0.10.2/dist/simpleMindMap.umd.min.js'

const mindmapRef = ref(null)
const dynamicHeight = ref(400)
const dynamicWidth = ref('100%')
let mindMap = null

function markdownToTree(md) {
    const lines = (md || '').split('\n').filter(l => l.trim())
    if (!lines.length) return { data: { text: 'Root' }, children: [] }

    const root = { data: { text: 'Mind Map' }, children: [] }
    const headingLines = lines.filter(l => /^#{1,6}\s/.test(l))

    if (headingLines.length >= 2) {
        const stack = [{ level: 0, node: root }]
        for (const line of lines) {
            const match = line.match(/^(#{1,6})\s+(.+)/)
            if (match) {
                const level = match[1].length
                const text = match[2].trim()
                const node = { data: { text }, children: [] }
                while (stack.length > 1 && stack[stack.length - 1].level >= level) stack.pop()
                stack[stack.length - 1].node.children.push(node)
                stack.push({ level, node })
            }
        }
        if (root.children.length === 1) return root.children[0]
        return root
    }

    const stack = [{ indent: -1, node: root }]
    for (const line of lines) {
        const match = line.match(/^(\s*)[-*+]\s+(.+)/)
        if (match) {
            const indent = match[1].length
            const text = match[2].trim()
            const node = { data: { text }, children: [] }
            while (stack.length > 1 && stack[stack.length - 1].indent >= indent) stack.pop()
            stack[stack.length - 1].node.children.push(node)
            stack.push({ indent, node })
        } else {
            root.data.text = line.trim()
        }
    }
    return root
}

function loadCss(url) {
    return new Promise((resolve) => {
        if (document.querySelector(`link[href="${url}"]`)) { resolve(true); return }
        const link = document.createElement('link')
        link.rel = 'stylesheet'
        link.href = url
        link.onload = () => resolve(true)
        link.onerror = () => resolve(false)
        document.head.appendChild(link)
    })
}

function loadScript(url) {
    return new Promise((resolve) => {
        if (window.simpleMindMap) { resolve(true); return }
        const script = document.createElement('script')
        script.src = url
        script.onload = () => resolve(true)
        script.onerror = () => resolve(false)
        document.head.appendChild(script)
    })
}

/**
 * 渲染完成后，根据 SVG 实际内容的 boundingBox 调整容器和 SVG 尺寸，
 * 确保所有节点都完整呈现。
 * mindMap 布局以 root 为中心向左右展开，bbox.x 可能为负数。
 */
function fitToContent() {
    if (!mindmapRef.value || !mindMap) return
    const svg = mindmapRef.value.querySelector('svg')
    if (!svg) return

    try {
        const bbox = svg.getBBox()
        if (bbox.width <= 0 || bbox.height <= 0) return

        const padding = 60
        // viewBox 直接覆盖 bbox 四周加 padding，确保所有内容可见
        const vbX = bbox.x - padding
        const vbY = bbox.y - padding
        const vbW = Math.ceil(bbox.width + padding * 2)
        const vbH = Math.ceil(bbox.height + padding * 2)

        // 设置 SVG 宽高和 viewBox 以显示全部内容
        svg.setAttribute('width', vbW)
        svg.setAttribute('height', vbH)
        svg.setAttribute('viewBox', `${vbX} ${vbY} ${vbW} ${vbH}`)
        // 防止 SVG 内部裁剪内容
        svg.style.overflow = 'visible'

        // 容器尺寸：宽度优先用内容宽度（允许超出父容器，外层 wrapper 处理滚动）
        dynamicWidth.value = vbW + 'px'
        dynamicHeight.value = Math.max(300, vbH)
    } catch (e) {
        // getBBox 在 SVG 未完全渲染时可能失败，保持默认尺寸
    }
}

async function renderMindMap() {
    if (!mindmapRef.value) return
    await loadCss(SMM_CSS)
    await loadScript(SMM_JS)
    if (!window.simpleMindMap?.default) return

    const MindMap = window.simpleMindMap.default
    if (mindMap) { mindMap.destroy(); mindMap = null }
    mindmapRef.value.innerHTML = ''

    const data = markdownToTree(props.node?.attrs?.content || '')

    // 初始用 100% 宽度让库完成首次布局
    dynamicWidth.value = '100%'
    dynamicHeight.value = 400

    await nextTick()

    mindMap = new MindMap({
        el: mindmapRef.value,
        data,
        readonly: true,
        // mindMap：root 居中，子节点向左右两侧展开
        layout: 'mindMap',
    })

    // 等待 SVG 渲染完成后根据实际内容调整尺寸
    // 库可能有动画/异步渲染，间隔重试直到 bbox 稳定
    let lastW = 0
    let lastH = 0
    let retries = 0
    const tryFit = () => {
        fitToContent()
        const svg = mindmapRef.value?.querySelector('svg')
        if (svg) {
            try {
                const bbox = svg.getBBox()
                // bbox 稳定（连续两次相同）或重试上限则停止
                if ((bbox.width !== lastW || bbox.height !== lastH) && retries < 6) {
                    lastW = bbox.width
                    lastH = bbox.height
                    retries++
                    setTimeout(tryFit, 400)
                }
            } catch (_) { /* noop */ }
        }
    }
    setTimeout(tryFit, 500)
}

onMounted(() => nextTick(() => renderMindMap()))

watch(() => props.node?.attrs?.content, () => {
    nextTick(() => renderMindMap())
})

onBeforeUnmount(() => mindMap?.destroy?.())
</script>

<style scoped>
.mindmap-render-wrapper {
    width: 100%;
    overflow: auto;
    margin: 12px 0;
    border: 1px solid #e5e7eb;
    border-radius: 8px;
    background: #fff;
}

.mindmap-render-preview {
    min-height: 300px;
    background: #fff;
}
</style>
