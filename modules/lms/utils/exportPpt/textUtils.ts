/**
 * Tiptap text extraction utilities
 */

import { BODY_FONT_SIZE, BODY_LINE_HEIGHT } from './constants'
import { cssColorToHex, parseFontSize } from './colorUtils'

/** Recursively extract plain text */
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

/** Apply Tiptap mark to pptxgenjs text run options */
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
 * Extract text runs (with formatting info) from a Tiptap content array
 * @param inlineMathCache Optional, inline formula pre-rendering cache (latex → Unicode text)
 *        When provided, inlineMath nodes are replaced with the corresponding Unicode text run
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
        // inline formula → replace with Unicode text (from KaTeX pre-rendering)
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

/** Estimate text height at a given width (inches) */
export function estimateTextHeight(
  text: string,
  widthInches: number,
  fontSize: number,
  lineHeight = BODY_LINE_HEIGHT,
): number {
  if (!text) return 0
  // Average character width ≈ fontSize * 0.55 pt
  const charsPerLine = Math.floor((widthInches * 72) / (fontSize * 0.55))
  const lines = Math.max(1, Math.ceil(text.length / Math.max(1, charsPerLine)))
  return (lines * fontSize * lineHeight) / 72
}
