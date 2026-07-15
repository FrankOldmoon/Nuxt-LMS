/**
 * KaTeX math formula pre-rendering
 *
 * - blockMath: KaTeX → HTML → html2canvas → PNG, inserted into slide as image (preserves original visual effect)
 * - inlineMath: KaTeX → HTML → DOM textContent, extracts Unicode text to replace LaTeX source in paragraphs
 *
 * Pre-rendering strategy: scan → render in parallel → cache → render slides synchronously (consistent with question pre-fetching)
 * Failure tolerance: when KaTeX/html2canvas fails to load, blockMath falls back to null (caller uses LaTeX source text), inlineMath is not written to cache (caller skips)
 */

import type { MathImage } from './types'
import { markdownToTiptap } from '../markdown'

// CDN base (consistent with math.vue, shares browser cache)
const KATEX_CDN_BASE = 'https://unpkg.com/@umoteam/editor-external@latest/libs/katex'
const HTML2CANVAS_CDN = 'https://cdn.jsdelivr.net/npm/html2canvas@1.4.1/dist/html2canvas.min.js'

/** Maximum width of the slide content area (inches, LAYOUT_WIDE = 13.33", 0.5" margin on each side) */
const MAX_CONTENT_WIDTH = 12.33

// ═══════════════════════════════════════
// CDN dynamic loading
// ═══════════════════════════════════════

let katexLoadPromise: Promise<void> | null = null

/** Load KaTeX JS + CSS (idempotent, resolves immediately if already loaded) */
export function loadKatex(): Promise<void> {
  if (typeof window !== 'undefined' && (window as any).katex) {
    return Promise.resolve()
  }
  if (katexLoadPromise) return katexLoadPromise

  katexLoadPromise = (async () => {
    // Load JS and CSS in parallel
    const cssPromise = new Promise<void>((resolve) => {
      if (document.getElementById('pptx-export-katex-css')) return resolve()
      const link = document.createElement('link')
      link.rel = 'stylesheet'
      link.href = `${KATEX_CDN_BASE}/katex.min.css`
      link.id = 'pptx-export-katex-css'
      link.onload = () => resolve()
      link.onerror = () => resolve() // CSS failure does not block (formulas can still render, just without styles)
      document.head.appendChild(link)
    })

    const jsPromise = new Promise<void>((resolve, reject) => {
      if (document.getElementById('pptx-export-katex-js')) {
        // script tag already exists but may not have finished loading
        const existing = document.getElementById('pptx-export-katex-js') as HTMLScriptElement
        if ((window as any).katex) return resolve()
        existing.addEventListener('load', () => resolve())
        existing.addEventListener('error', () => reject(new Error('Failed to load katex')))
        return
      }
      const script = document.createElement('script')
      script.src = `${KATEX_CDN_BASE}/katex.min.js`
      script.id = 'pptx-export-katex-js'
      script.type = 'text/javascript'
      script.onload = () => {
        if ((window as any).katex) resolve()
        else reject(new Error('katex loaded but window.katex not found'))
      }
      script.onerror = () => reject(new Error('Failed to load katex from CDN'))
      document.head.appendChild(script)
    })

    await Promise.all([cssPromise, jsPromise])
  })()

  return katexLoadPromise
}

let html2canvasLoadPromise: Promise<void> | null = null

/** Load html2canvas (idempotent) */
export function loadHtml2Canvas(): Promise<void> {
  if (typeof window !== 'undefined' && (window as any).html2canvas) {
    return Promise.resolve()
  }
  if (html2canvasLoadPromise) return html2canvasLoadPromise

  html2canvasLoadPromise = new Promise<void>((resolve, reject) => {
    if (document.getElementById('pptx-export-html2canvas')) {
      const existing = document.getElementById('pptx-export-html2canvas') as HTMLScriptElement
      if ((window as any).html2canvas) return resolve()
      existing.addEventListener('load', () => resolve())
      existing.addEventListener('error', () => reject(new Error('Failed to load html2canvas')))
      return
    }
    const script = document.createElement('script')
    script.src = HTML2CANVAS_CDN
    script.id = 'pptx-export-html2canvas'
    script.type = 'text/javascript'
    script.onload = () => {
      if ((window as any).html2canvas) resolve()
      else reject(new Error('html2canvas loaded but not found'))
    }
    script.onerror = () => reject(new Error('Failed to load html2canvas from CDN'))
    document.head.appendChild(script)
  })

  return html2canvasLoadPromise
}

// ═══════════════════════════════════════
// Formula rendering
// ═══════════════════════════════════════

/**
 * Render LaTeX to PNG image (for blockMath)
 * @returns MathImage or null (render failed)
 */
export async function latexToImage(latex: string, displayMode = true): Promise<MathImage | null> {
  if (typeof window === 'undefined') return null
  const katex = (window as any).katex
  if (!katex) return null

  let html: string
  try {
    html = katex.renderToString(latex, { displayMode, throwOnError: false })
  } catch {
    return null
  }
  if (!html) return null

  // Create off-screen container, apply KaTeX styles
  const container = document.createElement('div')
  container.style.position = 'absolute'
  container.style.left = '-9999px'
  container.style.top = '0'
  container.style.background = '#ffffff'
  container.style.padding = '12px 16px'
  container.style.display = 'inline-block'
  container.style.fontSize = '28px'  // High-resolution rendering
  container.style.color = '#333333'
  container.innerHTML = html
  document.body.appendChild(container)

  try {
    const html2canvas = (window as any).html2canvas
    if (!html2canvas) return null

    // Wait for KaTeX fonts to finish loading (@font-face fonts load on demand, need explicit triggering)
    // Otherwise html2canvas will capture formulas using fallback fonts, causing symbols to be misplaced or duplicated
    if (document.fonts) {
      try {
        // Explicitly request loading KaTeX font families (triggers @font-face download)
        await Promise.all([
          document.fonts.load('28px KaTeX_Main'),
          document.fonts.load('italic 28px KaTeX_Math'),
          document.fonts.load('28px KaTeX_Size1'),
          document.fonts.load('28px KaTeX_Size2'),
          document.fonts.load('28px KaTeX_Caligraphic'),
        ])
        await document.fonts.ready
      } catch { /* Font loading failure does not block */ }
    }
    // Wait an extra frame to ensure the browser completes layout
    await new Promise(resolve => setTimeout(resolve, 100))

    const canvas = await html2canvas(container, {
      scale: 2,
      backgroundColor: '#ffffff',
      logging: false,
      useCORS: true,
    })

    const dataUrl = canvas.toDataURL('image/png')
    if (!dataUrl || dataUrl === 'data:,') return null

    // Pixels → inches (96 DPI), limit max width
    let widthIn = canvas.width / 96
    let heightIn = canvas.height / 96
    if (widthIn > MAX_CONTENT_WIDTH) {
      const ratio = MAX_CONTENT_WIDTH / widthIn
      widthIn = MAX_CONTENT_WIDTH
      heightIn = heightIn * ratio
    }

    return { dataUrl, width: widthIn, height: heightIn }
  } catch {
    return null
  } finally {
    document.body.removeChild(container)
  }
}

/**
 * Render LaTeX to Unicode text (for inlineMath)
 * KaTeX output HTML contains Unicode math characters, textContent can extract readable text
 *
 * Note: KaTeX renderToString output contains katex-mathml (contains <annotation> original LaTeX source)
 * and katex-html (visual rendering) parts. If you extract using the entire span.textContent, you get
 * e=mc(MathML) + e=m^c(annotation) + e=mc(HTML) = e=mce=m^ce=mc (triple duplication).
 * Therefore only extract the text from the katex-html part.
 *
 * @returns Unicode text or latex original (fallback when rendering fails)
 */
export function latexToText(latex: string): string {
  if (typeof window === 'undefined') return latex
  const katex = (window as any).katex
  if (!katex) return latex

  try {
    const html = katex.renderToString(latex, { displayMode: false, throwOnError: false })
    if (!html) return latex
    const span = document.createElement('span')
    span.innerHTML = html
    // Only extract text from katex-html (visual rendering), skip katex-mathml (contains annotation with original LaTeX)
    const htmlPart = span.querySelector('.katex-html')
    const text = (htmlPart || span).textContent || ''
    return text.trim() || latex
  } catch {
    return latex
  }
}

// ═══════════════════════════════════════
// Pre-scan & pre-render
// ═══════════════════════════════════════

/**
 * Helper: convert any content (string/markdown/Tiptap JSON) to node array and collect math formulas
 * String content is first converted via markdownToTiptap (consistent with ueditorRender behavior),
 * ensuring $$...$$ / $...$ syntax can be parsed as blockMath/inlineMath nodes.
 */
function collectMathFromAnyContent(
  content: any,
  blockLatex: Set<string>,
  inlineLatex: Set<string>,
): void {
  if (!content) return
  let nodes: any[] = []
  if (typeof content === 'string') {
    if (!content.trim()) return
    const tiptap = markdownToTiptap(content)
    nodes = tiptap.content || []
  } else if (content.type === 'doc') {
    nodes = content.content || []
  } else if (Array.isArray(content)) {
    nodes = content
  } else if (content.type) {
    nodes = [content]
  }
  if (nodes.length > 0) {
    collectMathLatex(nodes, blockLatex, inlineLatex)
  }
}

/** Recursively scan and collect all blockMath/inlineMath latex strings (deduplicated) */
export function collectMathLatex(
  nodes: any[],
  blockLatex: Set<string>,
  inlineLatex: Set<string>,
): void {
  for (const node of nodes || []) {
    if (!node) continue
    if (node.type === 'blockMath') {
      const latex = node.attrs?.latex || ''
      if (latex) blockLatex.add(latex)
    } else if (node.type === 'inlineMath') {
      const latex = node.attrs?.latex || ''
      if (latex) inlineLatex.add(latex)
    }
    // Recursively scan child nodes
    if (Array.isArray(node.content)) {
      collectMathLatex(node.content, blockLatex, inlineLatex)
    }
    // vue tabs node: scan content of each tab (may contain math formulas)
    if (node.type === 'vue' && node.attrs?.type === 'tabs') {
      let config: any = node.attrs.content
      if (typeof config === 'string') {
        try { config = JSON.parse(config) } catch { config = null }
      }
      const tabs = Array.isArray(config?.tabs) ? config.tabs : []
      for (const tab of tabs) {
        collectMathFromAnyContent(tab?.content, blockLatex, inlineLatex)
      }
    }
  }
}

/**
 * Collect all math formulas from chapter nodes and pre-fetched caches
 * - Chapter nodes: collectMathLatex recursive scan (including vue tabs embedded content)
 * - Question cache: content + options (strings first converted via markdownToTiptap)
 * - Quiz/homework cache: content
 *
 * Ensures math formulas in nested content are pre-rendered before rendering, avoiding cache misses during rendering.
 */
export function collectAllMathLatex(
  nodes: any[],
  questionCache: Map<number, any>,
  quizCache: Map<number, any>,
  homeworkCache: Map<number, any>,
  blockLatex: Set<string>,
  inlineLatex: Set<string>,
): void {
  // 1. Scan chapter nodes (including vue tabs embedded content)
  collectMathLatex(nodes, blockLatex, inlineLatex)

  // 2. Scan question cache (content + options)
  for (const q of questionCache.values()) {
    collectMathFromAnyContent(q.content, blockLatex, inlineLatex)
    if (Array.isArray(q.options)) {
      for (const opt of q.options) {
        collectMathFromAnyContent(opt, blockLatex, inlineLatex)
      }
    }
  }

  // 3. Scan quiz/homework cache
  for (const quiz of quizCache.values()) {
    collectMathFromAnyContent(quiz.content, blockLatex, inlineLatex)
  }
  for (const hw of homeworkCache.values()) {
    collectMathFromAnyContent(hw.content, blockLatex, inlineLatex)
  }
}

/**
 * Pre-render all math formulas (in parallel)
 * - inlineMath: synchronous latexToText, write to inlineMathCache
 * - blockMath: parallel latexToImage, write to blockMathCache (null on failure)
 *
 * When questionCache/quizCache/homeworkCache is passed, additionally scans nested content
 * (question content/options, quiz/homework content) for math formulas, ensuring cache hits during rendering.
 *
 * Silently skips when KaTeX fails to load (caller uses fallback logic).
 */
export async function prerenderMathNodes(
  nodes: any[],
  blockMathCache: Map<string, MathImage | null>,
  inlineMathCache: Map<string, string>,
  questionCache?: Map<number, any>,
  quizCache?: Map<number, any>,
  homeworkCache?: Map<number, any>,
): Promise<void> {
  const blockLatexSet = new Set<string>()
  const inlineLatexSet = new Set<string>()
  if (questionCache || quizCache || homeworkCache) {
    collectAllMathLatex(
      nodes,
      questionCache || new Map(),
      quizCache || new Map(),
      homeworkCache || new Map(),
      blockLatexSet,
      inlineLatexSet,
    )
  } else {
    collectMathLatex(nodes, blockLatexSet, inlineLatexSet)
  }

  // Skip if no formulas
  if (blockLatexSet.size === 0 && inlineLatexSet.size === 0) return

  // inlineMath: use LaTeX source directly as text (does not depend on KaTeX)
  // Does not use latexToText: KaTeX's .katex-html uses CSS to position super/subscripts,
  // textContent extraction loses ^ _ and other format info (e.g. e=m^c → e=mc), better to display source directly
  for (const latex of inlineLatexSet) {
    inlineMathCache.set(latex, latex)
  }

  // blockMath: render to image in parallel (requires KaTeX + html2canvas)
  if (blockLatexSet.size > 0) {
    try {
      await loadKatex()
    } catch {
      // KaTeX load failed → blockMath uses text fallback (LaTeX source)
      for (const latex of blockLatexSet) {
        blockMathCache.set(latex, null)
      }
      return
    }

    try {
      await loadHtml2Canvas()
    } catch {
      // html2canvas load failed → blockMath uses text fallback (LaTeX source)
      for (const latex of blockLatexSet) {
        blockMathCache.set(latex, null)
      }
      return
    }

    await Promise.all(
      Array.from(blockLatexSet).map(async (latex) => {
        try {
          const img = await latexToImage(latex, true)
          blockMathCache.set(latex, img)
        } catch {
          blockMathCache.set(latex, null)
        }
      }),
    )
  }
}
