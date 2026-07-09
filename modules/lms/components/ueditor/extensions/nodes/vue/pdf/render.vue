<template>
    <div class="pdf-render-container">
        <div v-if="config.url" ref="previewRef" class="pdf-render-preview">
            <div v-for="p in renderedPages" :key="p" class="pdf-page-wrapper">
                <canvas :ref="el => { if (el) canvasRefs[p] = el }" class="pdf-page-canvas" />
                <div :ref="el => { if (el) textLayerRefs[p] = el }" class="pdf-text-layer" />
            </div>
            <div v-if="rendering" class="pdf-loading">
                <UIcon name="i-lucide-loader-2" class="animate-spin" />
                <span class="ml-2 text-sm text-gray-500">{{ t('common.loading') }}</span>
            </div>
        </div>
    </div>
</template>

<script setup>
const props = defineProps({
    node: Object,
})
const { t } = useI18n()

const PDFJS_CDN = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.0.379/pdf.min.mjs'
const PDFJS_WORKER = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.0.379/pdf.worker.min.mjs'

const previewRef = ref(null)
const canvasRefs = ref({})
const textLayerRefs = ref({})
const renderedPages = ref([])
const rendering = ref(false)
let pdfDoc = null

const config = computed(() => {
    try {
        const raw = props.node?.attrs?.content
        if (raw) return JSON.parse(raw)
    } catch (_) { /* noop */ }
    return {}
})

const displayPages = computed(() => {
    const pagesStr = config.value.pages?.trim()
    if (!pagesStr) return null
    const result = []
    for (const part of pagesStr.split(',')) {
        const trimmed = part.trim()
        const rangeMatch = trimmed.match(/^(\d+)-(\d+)$/)
        if (rangeMatch) {
            const start = parseInt(rangeMatch[1])
            const end = parseInt(rangeMatch[2])
            for (let i = start; i <= end; i++) result.push(i)
        } else {
            const n = parseInt(trimmed)
            if (!isNaN(n)) result.push(n)
        }
    }
    return result.length ? result : null
})

async function loadPdfJs() {
    if (window.pdfjsLib) return true
    try {
        const module = await import(/* @vite-ignore */ PDFJS_CDN)
        window.pdfjsLib = module
        if (module.GlobalWorkerOptions) {
            module.GlobalWorkerOptions.workerSrc = PDFJS_WORKER
        }
        return true
    } catch (e) {
        console.error('pdf.js 加载失败', e)
        return false
    }
}

async function renderPdf() {
    if (!config.value.url) return
    rendering.value = true

    const ok = await loadPdfJs()
    if (!ok) {
        rendering.value = false
        return
    }

    try {
        const loadingTask = window.pdfjsLib.getDocument(config.value.url)
        pdfDoc = await loadingTask.promise
        const totalPages = pdfDoc.numPages
        const pagesToRender = displayPages.value || Array.from({ length: totalPages }, (_, i) => i + 1)

        // 先设置页码列表，让 v-for 渲染出 canvas DOM
        canvasRefs.value = {}
        textLayerRefs.value = {}
        renderedPages.value = pagesToRender

        // 等待 DOM 更新完成
        await nextTick()
        await nextTick()

        for (const pageNum of pagesToRender) {
            if (pageNum < 1 || pageNum > totalPages) continue
            const canvas = canvasRefs.value[pageNum]
            const textLayerDiv = textLayerRefs.value[pageNum]
            if (!canvas) continue
            const page = await pdfDoc.getPage(pageNum)
            const viewport = page.getViewport({ scale: 1.2 })

            const context = canvas.getContext('2d')
            canvas.width = viewport.width
            canvas.height = viewport.height
            canvas.style.width = '100%'
            canvas.style.height = 'auto'

            await page.render({ canvasContext: context, viewport }).promise

            // 渲染 text 图层
            if (textLayerDiv) {
                const textContent = await page.getTextContent()
                textLayerDiv.innerHTML = ''
                textLayerDiv.style.width = `${viewport.width}px`
                textLayerDiv.style.height = `${viewport.height}px`

                const Util = window.pdfjsLib.Util

                for (const item of textContent.items) {
                    if (!item.str || !item.transform) continue

                    const span = document.createElement('span')
                    span.textContent = item.str

                    const tx = Util
                        ? Util.transform(viewport.transform, item.transform)
                        : [1, 0, 0, 1, item.transform[4], item.transform[5]]

                    const fontHeight = Math.hypot(tx[2], tx[3]) || (item.height || 10)

                    span.style.position = 'absolute'
                    span.style.left = `${tx[4]}px`
                    span.style.top = `${tx[5] - fontHeight}px`
                    span.style.fontSize = `${fontHeight}px`
                    span.style.fontFamily = item.fontName ? `${item.fontName}, sans-serif` : 'sans-serif'
                    span.style.transformOrigin = '0% 0%'

                    const angle = Math.atan2(tx[1], tx[0])
                    if (angle !== 0) {
                        span.style.transform = `rotate(${angle}rad)`
                    }

                    textLayerDiv.appendChild(span)
                }
            }
        }
    } catch (e) {
        console.error('PDF 渲染失败', e)
    } finally {
        rendering.value = false
    }
}

onMounted(() => {
    if (config.value.url) {
        nextTick(() => renderPdf())
    }
})

watch(() => config.value.url, () => {
    nextTick(() => renderPdf())
})

watch(() => config.value.pages, () => {
    nextTick(() => renderPdf())
})

onBeforeUnmount(() => {
    pdfDoc?.destroy?.()
})
</script>

<style scoped>
.pdf-render-container {
    margin: 12px 0;
    border: 1px solid #e5e7eb;
    border-radius: 8px;
    overflow: hidden;
    background: #fff;
}

.pdf-render-preview {
    background: #fff;
}

.pdf-page-wrapper {
    position: relative;
    background: #fff;
}

.pdf-page-canvas {
    display: block;
    width: 100%;
    height: auto;
}

.pdf-text-layer {
    position: absolute;
    left: 0;
    top: 0;
    width: 100%;
    height: 100%;
    overflow: hidden;
    opacity: 0.8;
    line-height: 1;
    text-size-adjust: none;
    forced-color-adjust: none;
    transform-origin: 0 0;
    z-index: 2;
}

.pdf-text-layer :deep(span) {
    position: absolute;
    white-space: pre;
    color: transparent;
    cursor: text;
    transform-origin: 0% 0%;
}

.pdf-text-layer :deep(::selection) {
    background: rgba(0, 100, 255, 0.3);
}

.pdf-loading {
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 24px;
}
</style>
