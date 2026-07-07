<template>
    <div ref="mindmapRef" class="mindmap-render-preview" :style="{ height: '400px' }" />
</template>

<script setup>
const props = defineProps({
    node: Object,
})

const SMM_CSS = 'https://unpkg.com/simple-mind-map@0.10.2/dist/simpleMindMap.esm.css'
const SMM_JS = 'https://unpkg.com/simple-mind-map@0.10.2/dist/simpleMindMap.umd.min.js'

const mindmapRef = ref(null)
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

async function renderMindMap() {
    if (!mindmapRef.value) return
    await loadCss(SMM_CSS)
    await loadScript(SMM_JS)
    if (!window.simpleMindMap?.default) return

    const MindMap = window.simpleMindMap.default
    if (mindMap) { mindMap.destroy(); mindMap = null }
    mindmapRef.value.innerHTML = ''

    const data = markdownToTree(props.node?.attrs?.content || '')
    mindMap = new MindMap({
        el: mindmapRef.value,
        data,
        readonly: true,
        layout: 'logicalStructure',
    })
}

onMounted(() => nextTick(() => renderMindMap()))

watch(() => props.node?.attrs?.content, () => {
    nextTick(() => renderMindMap())
})

onBeforeUnmount(() => mindMap?.destroy?.())
</script>

<style scoped>
.mindmap-render-preview {
    width: 100%;
    min-height: 300px;
    margin: 12px 0;
    border: 1px solid #e5e7eb;
    border-radius: 8px;
    overflow: hidden;
    background: #fff;
}
</style>
