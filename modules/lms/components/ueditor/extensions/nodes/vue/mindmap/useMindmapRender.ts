import { ref, nextTick, watch, onMounted, onBeforeUnmount } from 'vue'

export interface MindmapRenderProps {
    node?: any
}

const SMM_CSS = 'https://cdn.jsdelivr.net/npm/simple-mind-map@0.10.2/dist/simpleMindMap.esm.css'
const SMM_JS = 'https://cdn.jsdelivr.net/npm/simple-mind-map@0.10.2/dist/simpleMindMap.umd.min.js'

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
    const wrapEl = ref<any>(null)       // 外层容器（用于全屏）
    const mindmapRef = ref<any>(null)   // 内层 SVG 容器
    const dynamicHeight = ref(400)
    const dynamicWidth = ref('100%')
    const isFullscreen = ref(false)
    let mindMap: any = null

    /**
     * 根据 SVG 实际内容 boundingBox 调整 svg 尺寸/viewBox，确保所有节点完整呈现。
     * - fitScreen=true：全屏模式，svg 100% 撑满并让 viewBox 缩放居中（root 在中心）
     * - fitScreen=false：普通模式，svg 取内容尺寸（+padding），整体宽度恰好容纳全部节点
     */
    function setSvgSize(fitScreen: boolean) {
        if (!mindmapRef.value || !mindMap) return
        const svg = mindmapRef.value.querySelector('svg')
        if (!svg) return
        try {
            const bbox = svg.getBBox()
            if (bbox.width <= 0 || bbox.height <= 0) return

            const padding = 60
            svg.setAttribute('viewBox', `${bbox.x - padding} ${bbox.y - padding} ${bbox.width + padding * 2} ${bbox.height + padding * 2}`)
            svg.style.overflow = 'visible'

            if (fitScreen) {
                svg.setAttribute('width', '100%')
                svg.setAttribute('height', '100%')
                svg.style.width = '100%'
                svg.style.height = '100%'
                dynamicWidth.value = '100%'
                dynamicHeight.value = '100%'
            } else {
                const vbW = Math.ceil(bbox.width + padding * 2)
                const vbH = Math.ceil(bbox.height + padding * 2)
                svg.setAttribute('width', vbW)
                svg.setAttribute('height', vbH)
                dynamicWidth.value = vbW + 'px'
                dynamicHeight.value = Math.max(300, vbH)
            }
        } catch (e) {
            // SVG 未完全渲染时 getBBox 可能失败，保持默认尺寸
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
        dynamicHeight.value = isFullscreen.value ? '100%' : 400

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
            setSvgSize(isFullscreen.value)
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

    async function toggleFullscreen() {
        const el = wrapEl.value
        if (!el) return
        if (!document.fullscreenElement) {
            try { await (el.requestFullscreen || el.webkitRequestFullscreen)?.call(el) } catch (_) { /* noop */ }
        } else {
            try { await (document.exitFullscreen || document.webkitExitFullscreen)?.call(document) } catch (_) { /* noop */ }
        }
    }

    function onFsChange() {
        isFullscreen.value = !!document.fullscreenElement
        // 全屏后重新按屏幕 fit（等布局稳定再执行，多试几次）
        let retries = 0
        const fit = () => {
            setSvgSize(isFullscreen.value)
            if (retries < 5) { retries++; setTimeout(fit, 200) }
        }
        nextTick(fit)
    }

    onMounted(() => {
        document.addEventListener('fullscreenchange', onFsChange)
        nextTick(() => renderMindMap())
    })

    watch(() => props.node?.attrs?.content, () => {
        nextTick(() => renderMindMap())
    })

    onBeforeUnmount(() => {
        document.removeEventListener('fullscreenchange', onFsChange)
        mindMap?.destroy?.()
    })

    return { wrapEl, mindmapRef, dynamicHeight, dynamicWidth, isFullscreen, toggleFullscreen }
}