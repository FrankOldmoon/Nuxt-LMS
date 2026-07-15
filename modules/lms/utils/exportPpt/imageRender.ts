/**
 * Visualization node (echarts / mindmap / html) image rendering
 *
 * - echarts: echarts.init → setOption → getDataURL → PNG (mode=1 dynamically imports cal-service to convert chartConfig)
 * - mindmap: simple-mind-map renders SVG → html2canvas → PNG
 * - html: off-screen div innerHTML → html2canvas → PNG
 *
 * Pre-rendering strategy: scan → render in parallel → cache → render slides synchronously
 * Failure tolerance: failed renders write null, caller falls back to placeholder, does not block export
 */

import type { MathImage } from './types'
import { loadHtml2Canvas } from './mathRender'

/** Maximum width of the slide content area (inches) */
const MAX_CONTENT_WIDTH = 12.33

// ═══════════════════════════════════════
// CDN loading
// ═══════════════════════════════════════

const ECHARTS_CDN = 'https://unpkg.com/@umoteam/editor-external@latest/libs/echarts/echarts.min.js'
let echartsLoadPromise: Promise<void> | null = null

/** Load echarts (idempotent) */
export function loadEcharts(): Promise<void> {
  if (typeof window !== 'undefined' && (window as any).echarts) {
    return Promise.resolve()
  }
  if (echartsLoadPromise) return echartsLoadPromise

  echartsLoadPromise = new Promise<void>((resolve, reject) => {
    if (document.getElementById('pptx-export-echarts')) {
      const existing = document.getElementById('pptx-export-echarts') as HTMLScriptElement
      if ((window as any).echarts) return resolve()
      existing.addEventListener('load', () => resolve())
      existing.addEventListener('error', () => reject(new Error('Failed to load echarts')))
      return
    }
    const script = document.createElement('script')
    script.src = ECHARTS_CDN
    script.id = 'pptx-export-echarts'
    script.type = 'text/javascript'
    script.onload = () => {
      if ((window as any).echarts) resolve()
      else reject(new Error('echarts loaded but not found'))
    }
    script.onerror = () => reject(new Error('Failed to load echarts from CDN'))
    document.head.appendChild(script)
  })

  return echartsLoadPromise
}

const SMM_CSS = 'https://unpkg.com/simple-mind-map@0.10.2/dist/simpleMindMap.esm.css'
const SMM_JS = 'https://unpkg.com/simple-mind-map@0.10.2/dist/simpleMindMap.umd.min.js'
let smmLoadPromise: Promise<void> | null = null

/** Load simple-mind-map (idempotent) */
export function loadSimpleMindMap(): Promise<void> {
  if (typeof window !== 'undefined' && (window as any).simpleMindMap) {
    return Promise.resolve()
  }
  if (smmLoadPromise) return smmLoadPromise

  smmLoadPromise = (async () => {
    // CSS
    await new Promise<void>((resolve) => {
      if (document.querySelector(`link[href="${SMM_CSS}"]`)) return resolve()
      const link = document.createElement('link')
      link.rel = 'stylesheet'
      link.href = SMM_CSS
      link.onload = () => resolve()
      link.onerror = () => resolve()
      document.head.appendChild(link)
    })
    // JS
    await new Promise<void>((resolve, reject) => {
      if ((window as any).simpleMindMap) return resolve()
      const script = document.createElement('script')
      script.src = SMM_JS
      script.type = 'text/javascript'
      script.onload = () => {
        if ((window as any).simpleMindMap) resolve()
        else reject(new Error('simple-mind-map loaded but not found'))
      }
      script.onerror = () => reject(new Error('Failed to load simple-mind-map'))
      document.head.appendChild(script)
    })
  })()

  return smmLoadPromise
}

// ═══════════════════════════════════════
// Dimension conversion utilities
// ═══════════════════════════════════════

/** canvas pixels → MathImage (inches, limited to max width) */
function canvasToMathImage(canvas: HTMLCanvasElement): MathImage | null {
  const dataUrl = canvas.toDataURL('image/png')
  if (!dataUrl || dataUrl === 'data:,') return null
  let widthIn = canvas.width / 96
  let heightIn = canvas.height / 96
  if (widthIn > MAX_CONTENT_WIDTH) {
    const ratio = MAX_CONTENT_WIDTH / widthIn
    widthIn = MAX_CONTENT_WIDTH
    heightIn = heightIn * ratio
  }
  return { dataUrl, width: widthIn, height: heightIn }
}

// ═══════════════════════════════════════
// ECharts rendering
// ═══════════════════════════════════════

/** echarts node attrs → PNG. mode=1 dynamically imports cal-service.js to convert chartConfig */
export async function echartsToImage(attrs: any): Promise<MathImage | null> {
  if (typeof window === 'undefined') return null
  try {
    await loadEcharts()
  } catch {
    return null
  }
  const echarts = (window as any).echarts
  if (!echarts) return null

  const { chartOptions, chartConfig, mode } = attrs || {}
  let finalOptions: any = null

  if (mode === 1 && chartConfig) {
    // Basic mode: dynamically import cal-service to convert
    try {
      const calModule = await import('../../components/ueditor/render/cal-service.js')
      const newData = calModule.calbaseConfigData(chartConfig.data)
      finalOptions = calModule.calbaseConfigOptions(newData, chartConfig.config, {})
    } catch {
      return null
    }
  } else if (chartOptions) {
    finalOptions = chartOptions
  }

  if (!finalOptions || typeof finalOptions !== 'object' || !Object.keys(finalOptions).length) {
    return null
  }

  const heightPx = Number(attrs.height) || 200
  const widthPx = Math.round(MAX_CONTENT_WIDTH * 96)  // Full width of content area

  const container = document.createElement('div')
  container.style.position = 'absolute'
  container.style.left = '-9999px'
  container.style.top = '0'
  container.style.width = `${widthPx}px`
  container.style.height = `${heightPx}px`
  document.body.appendChild(container)

  let chart: any = null
  try {
    chart = echarts.init(container)
    // Disable animation to ensure getDataURL captures the fully rendered chart (otherwise animated chart types like bar charts may capture an intermediate state with height 0)
    finalOptions.animation = false
    chart.setOption(finalOptions)
    // Wait for rendering to complete (even with animation disabled, echarts internally needs one frame to complete layout)
    await new Promise(resolve => setTimeout(resolve, 200))
    const dataUrl = chart.getDataURL({
      type: 'png',
      pixelRatio: 2,
      backgroundColor: '#ffffff',
    })
    if (!dataUrl || dataUrl === 'data:,') return null

    // getDataURL returns base64, need to calculate actual dimensions (pixelRatio=2, so pixels = container size * 2)
    const widthIn = widthPx / 96
    const heightIn = heightPx / 96
    return { dataUrl, width: widthIn, height: heightIn }
  } catch {
    return null
  } finally {
    chart?.dispose?.()
    document.body.removeChild(container)
  }
}

// ═══════════════════════════════════════
// Mindmap rendering (copied from vue/mindmap/render.vue:20-58 markdownToTree)
// ═══════════════════════════════════════

function markdownToTree(md: string): any {
  const lines = (md || '').split('\n').filter((l: string) => l.trim())
  if (!lines.length) return { data: { text: 'Root' }, children: [] }

  const root: any = { data: { text: 'Mind Map' }, children: [] }
  const headingLines = lines.filter((l: string) => /^#{1,6}\s/.test(l))

  if (headingLines.length >= 2) {
    const stack: any[] = [{ level: 0, node: root }]
    for (const line of lines) {
      const match = line.match(/^(#{1,6})\s+(.+)/)
      if (match) {
        const level = match[1]!.length
        const text = match[2]!.trim()
        const node: any = { data: { text }, children: [] }
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
        const indent = match[1]!.length
        const text = match[2]!.trim()
      const node: any = { data: { text }, children: [] }
      while (stack.length > 1 && stack[stack.length - 1].indent >= indent) stack.pop()
      stack[stack.length - 1].node.children.push(node)
      stack.push({ indent, node })
    } else {
      root.data.text = line.trim()
    }
  }
  return root
}

/** markdown → mindmap SVG → html2canvas → PNG */
export async function mindmapToImage(markdown: string): Promise<MathImage | null> {
  if (typeof window === 'undefined' || !markdown) return null
  try {
    await loadSimpleMindMap()
  } catch {
    return null
  }
  const MindMap = (window as any).simpleMindMap?.default
  if (!MindMap) return null

  const container = document.createElement('div')
  container.style.position = 'absolute'
  container.style.left = '-9999px'
  container.style.top = '0'
  container.style.width = '800px'
  container.style.height = '400px'
  container.style.background = '#ffffff'
  document.body.appendChild(container)

  let mindMap: any = null
  try {
    const data = markdownToTree(markdown)
    mindMap = new MindMap({
      el: container,
      data,
      readonly: true,
      layout: 'mindMap',
    })

    // Wait for SVG rendering to complete (library has async rendering, retry until bbox is stable)
    await new Promise<void>((resolve) => {
      let lastW = 0
      let lastH = 0
      let retries = 0
      const tryFit = () => {
        const svg = container.querySelector('svg')
        if (svg) {
          try {
            const bbox = svg.getBBox()
            if (bbox.width > 0 && bbox.height > 0) {
              const padding = 60
              const vbX = bbox.x - padding
              const vbY = bbox.y - padding
              const vbW = Math.ceil(bbox.width + padding * 2)
              const vbH = Math.ceil(bbox.height + padding * 2)
              svg.setAttribute('width', String(vbW))
              svg.setAttribute('height', String(vbH))
              svg.setAttribute('viewBox', `${vbX} ${vbY} ${vbW} ${vbH}`)
              svg.style.overflow = 'visible'
              container.style.width = `${vbW}px`
              container.style.height = `${vbH}px`
            }
            if ((bbox.width !== lastW || bbox.height !== lastH) && retries < 6) {
              lastW = bbox.width
              lastH = bbox.height
              retries++
              setTimeout(tryFit, 400)
              return
            }
          } catch { /* noop */ }
        }
        resolve()
      }
      setTimeout(tryFit, 500)
    })

    await loadHtml2Canvas()
    const html2canvas = (window as any).html2canvas
    if (!html2canvas) return null

    const canvas = await html2canvas(container, {
      scale: 2,
      backgroundColor: '#ffffff',
      logging: false,
      useCORS: true,
    })
    return canvasToMathImage(canvas)
  } catch {
    return null
  } finally {
    mindMap?.destroy?.()
    document.body.removeChild(container)
  }
}

// ═══════════════════════════════════════
// HTML rendering
// ═══════════════════════════════════════

/** HTML string → PNG (rendered in off-screen div + html2canvas) */
export async function htmlToImage(html: string): Promise<MathImage | null> {
  if (typeof window === 'undefined' || !html) return null

  const container = document.createElement('div')
  container.style.position = 'absolute'
  container.style.left = '-9999px'
  container.style.top = '0'
  container.style.width = `${Math.round(MAX_CONTENT_WIDTH * 96)}px`
  container.style.background = '#ffffff'
  // Wrap with base body styles (refer to vue/html/render.vue:47-72)
  container.innerHTML = html
  container.style.fontFamily = '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
  container.style.boxSizing = 'border-box'
  container.style.padding = '8px'
  document.body.appendChild(container)

  try {
    await loadHtml2Canvas()
    const html2canvas = (window as any).html2canvas
    if (!html2canvas) return null

    const canvas = await html2canvas(container, {
      scale: 2,
      backgroundColor: '#ffffff',
      logging: false,
      useCORS: true,
    })
    return canvasToMathImage(canvas)
  } catch {
    return null
  } finally {
    document.body.removeChild(container)
  }
}

// ═══════════════════════════════════════
// Pre-scan & pre-render
// ═══════════════════════════════════════

/** Recursively collect all echarts nodes (using node object reference as key) */
export function collectEchartsNodes(nodes: any[], nodeRefs: any[]): void {
  for (const node of nodes || []) {
    if (!node) continue
    if (node.type === 'echarts') {
      nodeRefs.push(node)
    }
    if (Array.isArray(node.content)) {
      collectEchartsNodes(node.content, nodeRefs)
    }
  }
}

/** Recursively collect content of all vue mindmap/html nodes */
export function collectMindmapHtml(
  nodes: any[],
  mindmapKeys: Set<string>,
  htmlKeys: Set<string>,
): void {
  for (const node of nodes || []) {
    if (!node) continue
    if (node.type === 'vue') {
      const vueType = node.attrs?.type
      const content = node.attrs?.content
      if (typeof content === 'string' && content) {
        if (vueType === 'mindmap') mindmapKeys.add(content)
        else if (vueType === 'html') htmlKeys.add(content)
      }
    }
    if (Array.isArray(node.content)) {
      collectMindmapHtml(node.content, mindmapKeys, htmlKeys)
    }
  }
}

/**
 * Pre-render all image nodes (in parallel)
 * - echarts: render to PNG by node reference, write to echartsCache (null on failure)
 * - mindmap: render to PNG by markdown content, write to mindmapCache (null on failure)
 * - html: render to PNG by html content, write to htmlCache (null on failure)
 */
export async function prerenderImageNodes(
  nodes: any[],
  echartsCache: Map<any, MathImage | null>,
  mindmapCache: Map<string, MathImage | null>,
  htmlCache: Map<string, MathImage | null>,
): Promise<void> {
  // Collect
  const echartsNodeRefs: any[] = []
  const mindmapKeys = new Set<string>()
  const htmlKeys = new Set<string>()
  collectEchartsNodes(nodes, echartsNodeRefs)
  collectMindmapHtml(nodes, mindmapKeys, htmlKeys)

  if (echartsNodeRefs.length === 0 && mindmapKeys.size === 0 && htmlKeys.size === 0) return

  const tasks: Promise<void>[] = []

  // echarts parallel rendering
  for (const nodeRef of echartsNodeRefs) {
    tasks.push((async () => {
      try {
        const img = await echartsToImage(nodeRef.attrs || {})
        echartsCache.set(nodeRef, img)
      } catch {
        echartsCache.set(nodeRef, null)
      }
    })())
  }

  // mindmap parallel rendering
  for (const md of mindmapKeys) {
    tasks.push((async () => {
      try {
        const img = await mindmapToImage(md)
        mindmapCache.set(md, img)
      } catch {
        mindmapCache.set(md, null)
      }
    })())
  }

  // html parallel rendering
  for (const html of htmlKeys) {
    tasks.push((async () => {
      try {
        const img = await htmlToImage(html)
        htmlCache.set(html, img)
      } catch {
        htmlCache.set(html, null)
      }
    })())
  }

  await Promise.all(tasks)
}
