import { ref, nextTick, watch, onMounted, onBeforeUnmount } from 'vue'

export interface MindmapRenderProps {
    node?: any
}

const SMM_CSS = 'https://unpkg.com/simple-mind-map@0.10.2/dist/simpleMindMap.esm.css'
const SMM_JS = 'https://unpkg.com/simple-mind-map@0.10.2/dist/simpleMindMap.umd.min.js'

function markdownToTree(md: string) {
    const lines = (md || '').split('\n').filter(l => l.trim())
    if (!lines.length) return { data: { text: 'Root' }, children: [] }

    const root = { data: { text: 'Mind Map' }, children: [] }
    const headingLines = lines.filter(l => /^#{1,6}\s/.test(l))

    if (headingLines.length >= 2) {
        const stack: any[] = [{ level: 0, node: root }]
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

    const stack: any[] = [{ indent: -1, node: root }]
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

function loadCss(url: string) {
    return new Promise<boolean>((resolve) => {
        if (document.querySelector(`link[href="${url}"]`)) { resolve(true); return }
        const link = document.createElement('link')
        link.rel = 'stylesheet'
        link.href = url
        link.onload = () => resolve(true)
        link.onerror = () => resolve(false)
        document.head.appendChild(link)
    })
}

function loadScript(url: string) {
    return new Promise<boolean>((resolve) => {
        const w = window as any
        if (w.simpleMindMap) { resolve(true); return }
        const script = document.createElement('script')
        script.src = url
        script.onload = () => resolve(true)
        script.onerror = () => resolve(false)
        document.head.appendChild(script)
    })
}

export function useMindmapRender(props: MindmapRenderProps) {
    const mindmapRef = ref<any>(null)
    const dynamicHeight = ref(400)
    const dynamicWidth = ref('100%')
    let mindMap: any = null

    /**
     * RenderCompleteBack，based on SVG actualContent boundingBox Adjustcontainerand SVG size，
     * ensureAllnodePointallfully render。
     * mindMap layoutwith root MiddleHearttoLeftRightExpand，bbox.x cancannegative。
     */
    function fitToContent() {
        if (!mindmapRef.value || !mindMap) return
        const svg = mindmapRef.value.querySelector('svg')
        if (!svg) return

        try {
            const bbox = svg.getBBox()
            if (bbox.width <= 0 || bbox.height <= 0) return

            const padding = 60
            const vbX = bbox.x - padding
            const vbY = bbox.y - padding
            const vbW = Math.ceil(bbox.width + padding * 2)
            const vbH = Math.ceil(bbox.height + padding * 2)

            svg.setAttribute('width', vbW)
            svg.setAttribute('height', vbH)
            svg.setAttribute('viewBox', `${vbX} ${vbY} ${vbW} ${vbH}`)
            svg.style.overflow = 'visible'

            dynamicWidth.value = vbW + 'px'
            dynamicHeight.value = Math.max(300, vbH)
        } catch (e) {
            // getBBox  SVG not fullyRenderwhencancanFailed，keepDefaultsize
        }
    }

    async function renderMindMap() {
        if (!mindmapRef.value) return
        await loadCss(SMM_CSS)
        await loadScript(SMM_JS)
        const w = window as any
        if (!w.simpleMindMap?.default) return

        const MindMap = w.simpleMindMap.default
        if (mindMap) { mindMap.destroy(); mindMap = null }
        mindmapRef.value.innerHTML = ''

        const data = markdownToTree(props.node?.attrs?.content || '')

        dynamicWidth.value = '100%'
        dynamicHeight.value = 400

        await nextTick()

        mindMap = new MindMap({
            el: mindmapRef.value,
            data,
            readonly: true,
            layout: 'mindMap',
        })

        let lastW = 0
        let lastH = 0
        let retries = 0
        const tryFit = () => {
            fitToContent()
            const svg = mindmapRef.value?.querySelector('svg')
            if (svg) {
                try {
                    const bbox = svg.getBBox()
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

    return { mindmapRef, dynamicHeight, dynamicWidth }
}
