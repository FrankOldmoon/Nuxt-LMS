/**
 * KaTeX 数学公式预渲染
 *
 * - blockMath：KaTeX → HTML → html2canvas → PNG，作为图片插入幻灯片（保留原视觉效果）
 * - inlineMath：KaTeX → HTML → DOM textContent，提取 Unicode 文本替换段落中的 LaTeX 源码
 *
 * 预渲染策略：扫描 → 并行渲染 → 缓存 → 同步渲染幻灯片（与题目预取一致）
 * 失败容错：KaTeX/html2canvas 加载失败时，blockMath 回退 null（调用方走 LaTeX 源码文本），inlineMath 不写入缓存（调用方跳过）
 */

import type { MathImage } from './types'
import { markdownToTiptap } from '../markdown'

// CDN 基址（与 math.vue 一致，共享浏览器缓存）
const KATEX_CDN_BASE = 'https://cdn.jsdelivr.net/npm/@umoteam/editor-external@latest/libs/katex'
const HTML2CANVAS_CDN = 'https://cdn.jsdelivr.net/npm/html2canvas@1.4.1/dist/html2canvas.min.js'

/** 幻灯片内容区最大宽度（英寸，LAYOUT_WIDE = 13.33"，左右各 0.5" 边距） */
const MAX_CONTENT_WIDTH = 12.33

// ═══════════════════════════════════════
// CDN 动态加载
// ═══════════════════════════════════════

let katexLoadPromise: Promise<void> | null = null

/** 加载 KaTeX JS + CSS（幂等，已加载则直接 resolve） */
export function loadKatex(): Promise<void> {
  if (typeof window !== 'undefined' && (window as any).katex) {
    return Promise.resolve()
  }
  if (katexLoadPromise) return katexLoadPromise

  katexLoadPromise = (async () => {
    // 并行加载 JS 和 CSS
    const cssPromise = new Promise<void>((resolve) => {
      if (document.getElementById('pptx-export-katex-css')) return resolve()
      const link = document.createElement('link')
      link.rel = 'stylesheet'
      link.href = `${KATEX_CDN_BASE}/katex.min.css`
      link.id = 'pptx-export-katex-css'
      link.onload = () => resolve()
      link.onerror = () => resolve() // CSS 失败不阻断（公式仍可渲染，只是无样式）
      document.head.appendChild(link)
    })

    const jsPromise = new Promise<void>((resolve, reject) => {
      if (document.getElementById('pptx-export-katex-js')) {
        // script 标签已存在但可能尚未加载完成
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

/** 加载 html2canvas（幂等） */
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
// 公式渲染
// ═══════════════════════════════════════

/**
 * 将 LaTeX 渲染为 PNG 图片（用于 blockMath）
 * @returns MathImage 或 null（渲染失败）
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

  // 创建离屏容器，应用 KaTeX 样式
  const container = document.createElement('div')
  container.style.position = 'absolute'
  container.style.left = '-9999px'
  container.style.top = '0'
  container.style.background = '#ffffff'
  container.style.padding = '12px 16px'
  container.style.display = 'inline-block'
  container.style.fontSize = '28px'  // 高分辨率渲染
  container.style.color = '#333333'
  container.innerHTML = html
  document.body.appendChild(container)

  try {
    const html2canvas = (window as any).html2canvas
    if (!html2canvas) return null

    // 等待 KaTeX 字体加载完成（@font-face 字体按需加载，需显式触发）
    // 否则 html2canvas 会截到使用 fallback 字体的公式，导致符号错位或重复
    if (document.fonts) {
      try {
        // 显式请求加载 KaTeX 字体族（触发 @font-face 下载）
        await Promise.all([
          document.fonts.load('28px KaTeX_Main'),
          document.fonts.load('italic 28px KaTeX_Math'),
          document.fonts.load('28px KaTeX_Size1'),
          document.fonts.load('28px KaTeX_Size2'),
          document.fonts.load('28px KaTeX_Caligraphic'),
        ])
        await document.fonts.ready
      } catch { /* 字体加载失败不阻断 */ }
    }
    // 额外等待一帧确保浏览器完成布局
    await new Promise(resolve => setTimeout(resolve, 100))

    const canvas = await html2canvas(container, {
      scale: 2,
      backgroundColor: '#ffffff',
      logging: false,
      useCORS: true,
    })

    const dataUrl = canvas.toDataURL('image/png')
    if (!dataUrl || dataUrl === 'data:,') return null

    // 像素 → 英寸（96 DPI），限制最大宽度
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
 * 将 LaTeX 渲染为 Unicode 文本（用于 inlineMath）
 * KaTeX 输出的 HTML 含 Unicode 数学字符，textContent 可提取可读文本
 *
 * 注意：KaTeX renderToString 输出含 katex-mathml（含 <annotation> 原始 LaTeX 源码）
 * 和 katex-html（视觉渲染）两部分。若用整个 span.textContent 提取，会得到
 * e=mc(MathML) + e=m^c(annotation) + e=mc(HTML) = e=mce=m^ce=mc（三重重复）。
 * 因此只提取 katex-html 部分的文本。
 *
 * @returns Unicode 文本或 latex 原文（渲染失败时回退）
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
    // 只提取 katex-html（视觉渲染）的文本，跳过 katex-mathml（含 annotation 原始 LaTeX）
    const htmlPart = span.querySelector('.katex-html')
    const text = (htmlPart || span).textContent || ''
    return text.trim() || latex
  } catch {
    return latex
  }
}

// ═══════════════════════════════════════
// 预扫描 & 预渲染
// ═══════════════════════════════════════

/**
 * 辅助：将任意内容（字符串/markdown/Tiptap JSON）转为节点数组并收集数学公式
 * 字符串内容先经 markdownToTiptap 转换（与 ueditorRender 行为一致），
 * 确保 $$...$$ / $...$ 语法能被解析为 blockMath/inlineMath 节点。
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

/** 递归扫描收集所有 blockMath/inlineMath 的 latex 字符串（去重） */
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
    // 递归扫描子节点
    if (Array.isArray(node.content)) {
      collectMathLatex(node.content, blockLatex, inlineLatex)
    }
    // vue tabs 节点：扫描各 tab 的内容（可能含数学公式）
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
 * 从章节节点和预取缓存中收集所有数学公式
 * - 章节节点：collectMathLatex 递归扫描（含 vue tabs 内嵌内容）
 * - 题目缓存：content + options（字符串先经 markdownToTiptap 转换）
 * - 测验/作业缓存：content
 *
 * 确保嵌套内容中的数学公式在渲染前被预渲染，避免渲染时缓存未命中。
 */
export function collectAllMathLatex(
  nodes: any[],
  questionCache: Map<number, any>,
  quizCache: Map<number, any>,
  homeworkCache: Map<number, any>,
  blockLatex: Set<string>,
  inlineLatex: Set<string>,
): void {
  // 1. 扫描章节节点（包括 vue tabs 内嵌内容）
  collectMathLatex(nodes, blockLatex, inlineLatex)

  // 2. 扫描题目缓存（content + options）
  for (const q of questionCache.values()) {
    collectMathFromAnyContent(q.content, blockLatex, inlineLatex)
    if (Array.isArray(q.options)) {
      for (const opt of q.options) {
        collectMathFromAnyContent(opt, blockLatex, inlineLatex)
      }
    }
  }

  // 3. 扫描测验/作业缓存
  for (const quiz of quizCache.values()) {
    collectMathFromAnyContent(quiz.content, blockLatex, inlineLatex)
  }
  for (const hw of homeworkCache.values()) {
    collectMathFromAnyContent(hw.content, blockLatex, inlineLatex)
  }
}

/**
 * 预渲染所有数学公式（并行）
 * - inlineMath：同步 latexToText，写入 inlineMathCache
 * - blockMath：并行 latexToImage，写入 blockMathCache（失败写 null）
 *
 * 传入 questionCache/quizCache/homeworkCache 时，会额外扫描嵌套内容
 * （题目 content/options、测验/作业 content）中的数学公式，确保渲染时缓存命中。
 *
 * KaTeX 加载失败时静默跳过（调用方走回退逻辑）。
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

  // 无公式则跳过
  if (blockLatexSet.size === 0 && inlineLatexSet.size === 0) return

  // inlineMath：直接用 LaTeX 源码作为文本（不依赖 KaTeX）
  // 不使用 latexToText：KaTeX 的 .katex-html 用 CSS 定位上标/下标，
  // textContent 提取后会丢失 ^ _ 等格式信息（如 e=m^c → e=mc），不如直接显示源码
  for (const latex of inlineLatexSet) {
    inlineMathCache.set(latex, latex)
  }

  // blockMath：并行渲染为图片（需 KaTeX + html2canvas）
  if (blockLatexSet.size > 0) {
    try {
      await loadKatex()
    } catch {
      // KaTeX 加载失败 → blockMath 走文本回退（LaTeX 源码）
      for (const latex of blockLatexSet) {
        blockMathCache.set(latex, null)
      }
      return
    }

    try {
      await loadHtml2Canvas()
    } catch {
      // html2canvas 加载失败 → blockMath 走文本回退（LaTeX 源码）
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
