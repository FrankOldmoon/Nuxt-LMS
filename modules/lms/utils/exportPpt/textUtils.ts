/**
 * Tiptap 文本提取工具
 */

import { BODY_FONT_SIZE, BODY_LINE_HEIGHT } from './constants'
import { cssColorToHex, parseFontSize } from './colorUtils'

/** 递归提取纯文本 */
export function extractPlainText(node: any): string {
  if (!node) return ''
  if (typeof node === 'string') return node
  if (node.type === 'text') return node.text || ''
  if (node.text) return node.text
  if (Array.isArray(node.content)) {
    return node.content.map(extractPlainText).join('')
  }
  return ''
}

/** 将 Tiptap mark 应用到 pptxgenjs text run options */
export function applyMark(mark: any, opts: any): void {
  const { type, attrs = {} } = mark
  switch (type) {
    case 'bold': opts.bold = true; break
    case 'italic': opts.italic = true; break
    case 'strike': opts.strike = true; break
    case 'code':
      opts.fontFace = 'Courier New'
      opts.backgroundColor = 'F0F0F0'
      break
    case 'underline': opts.underline = true; break
    case 'subscript': opts.subscript = true; break
    case 'superscript': opts.superscript = true; break
    case 'link':
      if (attrs.href) opts.hyperlink = { url: attrs.href }
      break
    case 'textStyle': {
      if (attrs.color) {
        const hex = cssColorToHex(attrs.color)
        if (hex) opts.color = hex
      }
      if (attrs.fontSize) {
        const pt = parseFontSize(attrs.fontSize)
        if (pt) opts.fontSize = pt
      }
      if (attrs.fontFamily) opts.fontFace = attrs.fontFamily
      if (attrs.backgroundColor) {
        const hex = cssColorToHex(attrs.backgroundColor)
        if (hex) opts.backgroundColor = hex
      }
      break
    }
  }
}

/**
 * 从 Tiptap content 数组提取 text runs（带格式信息）
 * @param inlineMathCache 可选，行内公式预渲染缓存（latex → Unicode 文本）
 *        传入后 inlineMath 节点会被替换为对应的 Unicode 文本 run
 */
export function extractTextRuns(content: any[], inlineMathCache?: Map<string, string>): any[] {
  const runs: any[] = []
  function walk(nodes: any[]) {
    for (const node of nodes) {
      if (node.type === 'text') {
        const opts: any = {}
        if (node.marks) node.marks.forEach((m: any) => applyMark(m, opts))
        if (!opts.fontSize) opts.fontSize = BODY_FONT_SIZE
        if (!opts.fontFace) opts.fontFace = 'Calibri'
        runs.push({ text: node.text || '', options: opts })
      } else if (node.type === 'hardBreak') {
        runs.push({ text: '\n', options: { breakLine: true } })
      } else if (node.type === 'inlineMath') {
        // 行内公式 → 替换为 Unicode 文本（来自 KaTeX 预渲染）
        const latex = node.attrs?.latex || ''
        if (latex && inlineMathCache) {
          const text = inlineMathCache.get(latex)
          if (text) {
            runs.push({ text, options: { fontSize: BODY_FONT_SIZE, fontFace: 'Calibri' } })
          }
        }
      } else if (node.content) {
        walk(node.content)
      }
    }
  }
  walk(content || [])
  return runs
}

/** 估算文本在指定宽度下的高度（英寸） */
export function estimateTextHeight(
  text: string,
  widthInches: number,
  fontSize: number,
  lineHeight = BODY_LINE_HEIGHT,
): number {
  if (!text) return 0
  // 平均字符宽度 ≈ fontSize * 0.55 pt
  const charsPerLine = Math.floor((widthInches * 72) / (fontSize * 0.55))
  const lines = Math.max(1, Math.ceil(text.length / Math.max(1, charsPerLine)))
  return (lines * fontSize * lineHeight) / 72
}
