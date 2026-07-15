/**
 * Core node renderer
 * Renders various Tiptap JSON node types to pptxgenjs slides
 */

import type { SlideContext } from './types'
import { HEADING_FONT_SIZES, BODY_FONT_SIZE, BODY_LINE_HEIGHT, CODE_FONT_SIZE, CODE_LINE_HEIGHT } from './constants'
import { cssColorToHex } from './colorUtils'
import { extractPlainText, extractTextRuns, estimateTextHeight } from './textUtils'
import { flattenListItems, flattenTaskItems, addListItems } from './listUtils'
import { buildTableRows } from './tableUtils'
import { highlightCodeToRuns, splitRunsByLines, CODE_DEFAULT_COLOR } from './codeHighlight'
import { QUESTION_TYPE_LABELS, formatQuestionAnswer } from './questionUtils'
import { extractQuizQuestionCids, extractRaceQuestionCids } from './vueDataFetch'
import { newSlide } from './slideUtils'
import { markdownToTiptap } from '../markdown'

// ═══════════════════════════════════════
// Tiptap content generic rendering
// ═══════════════════════════════════════

/**
 * Render Tiptap content to slides
 * - string → markdownToTiptap converts to Tiptap JSON then recursively renders (consistent with ueditorRender behavior)
 * - Tiptap doc object → recursive addNodeToSlide
 * - single node (paragraph/codeBlock etc.) → direct addNodeToSlide
 * - node array → addNodeToSlide one by one
 */
function renderTiptapContent(ctx: SlideContext, content: any, pres: any, indentLevel = 0): void {
  if (!content) return
  if (typeof content === 'string') {
    // string → markdown converts to Tiptap JSON then recursively renders (consistent with ueditorRender behavior)
    if (!content.trim()) return
    const tiptap = markdownToTiptap(content)
    renderTiptapContent(ctx, tiptap, pres, indentLevel)
  } else if (typeof content === 'object') {
    if (Array.isArray(content)) {
      // node array → render one by one
      for (const c of content) {
        if (c && typeof c === 'object') addNodeToSlide(ctx, c, pres, indentLevel)
      }
    } else if (content.type === 'doc') {
      // doc object → recursively render content array
      for (const c of content.content || []) {
        addNodeToSlide(ctx, c, pres, indentLevel)
      }
    } else if (content.type) {
      // single node (paragraph/codeBlock etc.) → render directly
      addNodeToSlide(ctx, content, pres, indentLevel)
    }
  }
}

/** Render image (MathImage) centered to slide, returns whether successful */
function addCachedImage(ctx: SlideContext, img: { dataUrl: string; width: number; height: number } | null | undefined, pres: any): boolean {
  if (!img) return false
  if (ctx.currentY + img.height + 0.2 > ctx.maxY) newSlide(ctx, pres)
  const x = ctx.marginX + (ctx.contentWidth - img.width) / 2
  ctx.slide.addImage({
    data: img.dataUrl,
    x,
    y: ctx.currentY,
    w: img.width,
    h: img.height,
    sizing: { type: 'contain', w: img.width, h: img.height },
  })
  ctx.currentY += img.height + 0.2
  return true
}

/** Placeholder label rendering (interactive/complex types) */
function addPlaceholderLabel(ctx: SlideContext, label: string, pres: any): void {
  if (ctx.currentY + 0.35 > ctx.maxY) newSlide(ctx, pres)
  ctx.slide.addText(label, {
    x: ctx.marginX, y: ctx.currentY, w: ctx.contentWidth, h: 0.3,
    fontSize: 12, italic: true, color: '999999', fontFace: 'Calibri',
  })
  ctx.currentY += 0.35
}

// ═══════════════════════════════════════
// Group border (simulates PPT group — pptxgenjs does not support native group)
// ═══════════════════════════════════════

/** Group border style (matches editor question's border-gray-200 + rounded-lg + p-4) */
const GROUP_BORDER_COLOR = 'D1D5DB'   // gray-300 (clearer than gray-200 in PPT)
const GROUP_BORDER_WIDTH = 1          // pt
const GROUP_BORDER_RADIUS = 0.06      // inches, small rounded corner
const GROUP_PADDING = 0.12            // inches, inner padding

/**
 * Draw a border around already-rendered content, making all child elements visually form a group.
 *
 * Implementation notes:
 * - Border is added **after** content rendering (z-order on top)
 * - Uses fill: { type: 'none' } transparent fill, does not cover already-rendered content, only border line is visible
 * - Supports both single-page (one roundRect) and cross-page (first page to bottom + last page from top) cases
 *
 * @param startSlide    slide object when rendering started
 * @param startY        Y coordinate when rendering started
 * @param marginX       left margin when rendering started (option indent temporarily changes marginX, need initial value)
 * @param contentWidth  content width when rendering started
 */
function addGroupBorder(
  ctx: SlideContext,
  startSlide: any,
  startY: number,
  marginX: number,
  contentWidth: number,
): void {
  const endSlide = ctx.slide
  const endY = ctx.currentY
  const bx = marginX - GROUP_PADDING
  const bw = contentWidth + GROUP_PADDING * 2

  if (startSlide === endSlide) {
    // single page: from startY to endY
    const by = startY - GROUP_PADDING
    const bh = endY - startY + GROUP_PADDING * 2
    if (bh > 0) {
      startSlide.addShape('roundRect', {
        x: bx, y: by, w: bw, h: bh,
        fill: { type: 'none' },
        line: { color: GROUP_BORDER_COLOR, width: GROUP_BORDER_WIDTH },
        rectRadius: GROUP_BORDER_RADIUS,
      })
    }
  } else {
    // cross-page: first page from startY to slide bottom
    const firstBy = startY - GROUP_PADDING
    const firstBh = ctx.maxY - firstBy
    if (firstBh > 0) {
      startSlide.addShape('roundRect', {
        x: bx, y: firstBy, w: bw, h: firstBh,
        fill: { type: 'none' },
        line: { color: GROUP_BORDER_COLOR, width: GROUP_BORDER_WIDTH },
        rectRadius: GROUP_BORDER_RADIUS,
      })
    }
    // last page from top to endY
    const lastBy = ctx.startY - GROUP_PADDING
    const lastBh = endY - ctx.startY + GROUP_PADDING * 2
    if (lastBh > 0) {
      endSlide.addShape('roundRect', {
        x: bx, y: lastBy, w: bw, h: lastBh,
        fill: { type: 'none' },
        line: { color: GROUP_BORDER_COLOR, width: GROUP_BORDER_WIDTH },
        rectRadius: GROUP_BORDER_RADIUS,
      })
    }
  }
}

// ═══════════════════════════════════════
// Vue extension type rendering (quiz/homework/race/tabs/mindmap/html)
// ═══════════════════════════════════════

/** quiz: label + name + time + content(Tiptap) + nested questions */
function addQuizToSlide(ctx: SlideContext, cidContent: any, pres: any): void {
  const cid = Number(cidContent) || 0
  const quiz = cid > 0 ? ctx.quizCache.get(cid) : null
  if (!quiz) {
    addPlaceholderLabel(ctx, `[Quiz: ${cidContent}]`, pres)
    return
  }

  newSlide(ctx, pres)
  // label + name
  ctx.slide.addText([
    { text: '[Quiz] ', options: { bold: true, color: 'D97706', fontSize: 15 } },
    { text: quiz.name || '', options: { bold: true, color: '333333', fontSize: 15 } },
  ], {
    x: ctx.marginX, y: ctx.currentY, w: ctx.contentWidth, h: 0.4,
    fontFace: 'Calibri', valign: 'top',
  })
  ctx.currentY += 0.45

  // time info
  const timeInfo: string[] = []
  if (quiz.startAt) timeInfo.push(`Start: ${quiz.startAt}`)
  if (quiz.endAt) timeInfo.push(`End: ${quiz.endAt}`)
  if (timeInfo.length > 0) {
    if (ctx.currentY + 0.3 > ctx.maxY) newSlide(ctx, pres)
    ctx.slide.addText(timeInfo.join('  |  '), {
      x: ctx.marginX, y: ctx.currentY, w: ctx.contentWidth, h: 0.3,
      fontSize: 11, color: '666666', fontFace: 'Calibri', valign: 'top',
    })
    ctx.currentY += 0.32
  }

  // quiz content (Tiptap)
  renderTiptapContent(ctx, quiz.content, pres, 0)

  // nested questions (reuse addQuestionToSlide)
  const questionCids = extractQuizQuestionCids(quiz)
  for (const qid of questionCids) {
    const qData = ctx.questionCache.get(qid)
    if (qData) addQuestionToSlide(ctx, qData, pres)
  }
}

/** homework: label + name + code + content(Tiptap) + tags + explanation */
function addHomeworkToSlide(ctx: SlideContext, cidContent: any, pres: any): void {
  const cid = Number(cidContent) || 0
  const hw = cid > 0 ? ctx.homeworkCache.get(cid) : null
  if (!hw) {
    addPlaceholderLabel(ctx, `[Homework: ${cidContent}]`, pres)
    return
  }

  newSlide(ctx, pres)
  // label + name + code
  ctx.slide.addText([
    { text: '[Homework] ', options: { bold: true, color: '7C3AED', fontSize: 15 } },
    { text: hw.name || '', options: { bold: true, color: '333333', fontSize: 15 } },
    { text: hw.code ? `  ${hw.code}` : '', options: { color: '999999', fontSize: 12, fontFace: 'Courier New' } },
  ], {
    x: ctx.marginX, y: ctx.currentY, w: ctx.contentWidth, h: 0.4,
    fontFace: 'Calibri', valign: 'top',
  })
  ctx.currentY += 0.45

  // homework content (Tiptap)
  renderTiptapContent(ctx, hw.content, pres, 0)

  // tags
  if (Array.isArray(hw.tags) && hw.tags.length > 0) {
    const tagText = hw.tags.join('  |  ')
    if (ctx.currentY + 0.3 > ctx.maxY) newSlide(ctx, pres)
    ctx.slide.addText(`Tags: ${tagText}`, {
      x: ctx.marginX, y: ctx.currentY, w: ctx.contentWidth, h: 0.3,
      fontSize: 11, color: '666666', fontFace: 'Calibri', valign: 'top',
    })
    ctx.currentY += 0.32
  }

  // answer explanation
  if (hw.explanation && typeof hw.explanation === 'string' && hw.explanation.trim()) {
    if (ctx.currentY + 0.4 > ctx.maxY) newSlide(ctx, pres)
    ctx.slide.addText([
      { text: '💡 ', options: { fontSize: BODY_FONT_SIZE - 1 } },
      { text: hw.explanation, options: { italic: true, color: '666666', fontSize: BODY_FONT_SIZE - 1 } },
    ], {
      x: ctx.marginX, y: ctx.currentY, w: ctx.contentWidth, h: 0.35,
      fontFace: 'Calibri', valign: 'top',
    })
    ctx.currentY += 0.4
  }
}

/** race: label + name + nested questions */
function addRaceToSlide(ctx: SlideContext, cidContent: any, pres: any): void {
  const cid = Number(cidContent) || 0
  const race = cid > 0 ? ctx.raceCache.get(cid) : null
  if (!race) {
    addPlaceholderLabel(ctx, `[Race: ${cidContent}]`, pres)
    return
  }

  newSlide(ctx, pres)
  // label + name
  ctx.slide.addText([
    { text: '[Race] ', options: { bold: true, color: 'DC2626', fontSize: 15 } },
    { text: race.name || '', options: { bold: true, color: '333333', fontSize: 15 } },
  ], {
    x: ctx.marginX, y: ctx.currentY, w: ctx.contentWidth, h: 0.4,
    fontFace: 'Calibri', valign: 'top',
  })
  ctx.currentY += 0.45

  // nested questions
  const questionCids = extractRaceQuestionCids(race)
  for (const qid of questionCids) {
    const qData = ctx.questionCache.get(qid)
    if (qData) addQuestionToSlide(ctx, qData, pres)
  }
}

/** tabs: each tab on a new page, label + content(Tiptap) */
function addTabsToSlide(ctx: SlideContext, content: any, pres: any): void {
  let config: any = null
  try {
    config = typeof content === 'string' ? JSON.parse(content) : content
  } catch { /* noop */ }
  const tabs = Array.isArray(config?.tabs) ? config.tabs : []
  if (tabs.length === 0) {
    addPlaceholderLabel(ctx, '[Tabs]', pres)
    return
  }

  for (const tab of tabs) {
    newSlide(ctx, pres)
    // tab label
    ctx.slide.addText([
      { text: '[Tab] ', options: { bold: true, color: '2B579A', fontSize: 15 } },
      { text: tab.label || '', options: { bold: true, color: '333333', fontSize: 15 } },
    ], {
      x: ctx.marginX, y: ctx.currentY, w: ctx.contentWidth, h: 0.4,
      fontFace: 'Calibri', valign: 'top',
    })
    ctx.currentY += 0.45
    // tab content (Tiptap)
    renderTiptapContent(ctx, tab.content, pres, 0)
  }
}

/** mindmap: uses pre-rendered mindmapCache image */
function addMindmapToSlide(ctx: SlideContext, markdown: any, pres: any): void {
  if (typeof markdown !== 'string' || !markdown) {
    addPlaceholderLabel(ctx, '[Mindmap]', pres)
    return
  }
  const img = ctx.mindmapCache.get(markdown)
  if (addCachedImage(ctx, img, pres)) return
  // fallback: markdown source text
  if (ctx.currentY + 0.4 > ctx.maxY) newSlide(ctx, pres)
  ctx.slide.addText(`[Mindmap]\n${markdown.substring(0, 200)}`, {
    x: ctx.marginX, y: ctx.currentY, w: ctx.contentWidth, h: 0.35,
    fontSize: 12, italic: true, color: '999999', fontFace: 'Calibri',
  })
  ctx.currentY += 0.4
}

/** html block: uses pre-rendered htmlCache image */
function addHtmlToSlide(ctx: SlideContext, html: any, pres: any): void {
  if (typeof html !== 'string' || !html) {
    addPlaceholderLabel(ctx, '[HTML Block]', pres)
    return
  }
  const img = ctx.htmlCache.get(html)
  if (addCachedImage(ctx, img, pres)) return
  // fallback: placeholder
  addPlaceholderLabel(ctx, '[HTML Block]', pres)
}

// ═══════════════════════════════════════
// Question rendering (vue question node)
// ═══════════════════════════════════════

/** Render a question to slide (question label+name, content, options, answer, explanation) */
export function addQuestionToSlide(ctx: SlideContext, questionData: any, pres: any): void {
  if (!questionData) return

  const type = questionData.type || 'single'
  const name = questionData.name || ''
  const typeLabel = QUESTION_TYPE_LABELS[type] || type

  // render question on new page (maintain independence)
  if (ctx.currentY > ctx.startY + 0.1) {
    newSlide(ctx, pres)
  }

  // record start position (for drawing group border — question has border in editor, also preserved in PPT)
  const groupStartSlide = ctx.slide
  const groupStartY = ctx.currentY
  const groupMarginX = ctx.marginX
  const groupContentWidth = ctx.contentWidth

  // ── question label + name ──
  ctx.slide.addText([
    { text: `[${typeLabel}] `, options: { bold: true, color: '2B579A', fontSize: 15 } },
    { text: name, options: { bold: true, color: '333333', fontSize: 15 } },
  ], {
    x: ctx.marginX,
    y: ctx.currentY,
    w: ctx.contentWidth,
    h: 0.4,
    fontFace: 'Calibri',
    valign: 'top',
  })
  ctx.currentY += 0.45

  // ── question content (Tiptap JSON or markdown string → recursive render) ──
  renderTiptapContent(ctx, questionData.content, pres, 0)

  // ── options (choice/sort/classify/match questions) ──
  const options = questionData.options
  if (Array.isArray(options) && options.length > 0) {
    if (type === 'single' || type === 'multiple' || type === 'select' || type === 'sort') {
      for (let i = 0; i < options.length; i++) {
        const opt = options[i]
        const prefix = `${String.fromCharCode(65 + i)}. `

        // parse option to Tiptap node array (string → markdownToTiptap, Tiptap JSON → take content directly)
        let optNodes: any[] = []
        if (typeof opt === 'string') {
          if (opt.trim()) optNodes = markdownToTiptap(opt).content || []
        } else if (opt?.type === 'doc') {
          optNodes = opt.content || []
        } else if (Array.isArray(opt)) {
          optNodes = opt
        } else if (opt?.type) {
          optNodes = [opt]
        }

        // determine if simple content (only paragraph/text/hardBreak, no block-level elements like codeBlock/image/blockMath)
        const isInlineOnly = optNodes.every((n: any) =>
          n.type === 'paragraph' || n.type === 'text' || n.type === 'hardBreak',
        )

        if (isInlineOnly) {
          // simple content: letter prefix + content merged into same text box (user requires ABCD letters and content together)
          if (ctx.currentY + 0.3 > ctx.maxY) newSlide(ctx, pres)
          // collect all paragraph inline child nodes
          const inlineNodes: any[] = []
          for (const n of optNodes) {
            if (n.type === 'paragraph' && Array.isArray(n.content)) {
              inlineNodes.push(...n.content)
            } else if (n.type === 'text' || n.type === 'hardBreak') {
              inlineNodes.push(n)
            }
          }
          const runs = extractTextRuns(inlineNodes, ctx.inlineMathCache)
          // prefix as first run (bold)
          runs.unshift({ text: prefix, options: { bold: true, fontSize: BODY_FONT_SIZE, fontFace: 'Calibri' } })
          const plainText = runs.map((r: any) => r.text).join('')
          const height = estimateTextHeight(plainText, ctx.contentWidth - 0.3, BODY_FONT_SIZE, BODY_LINE_HEIGHT)
          ctx.slide.addText(runs, {
            x: ctx.marginX + 0.3, y: ctx.currentY, w: ctx.contentWidth - 0.3, h: Math.max(0.3, height),
            fontFace: 'Calibri', valign: 'top', lineSpacingMultiple: BODY_LINE_HEIGHT,
          })
          ctx.currentY += Math.max(0.3, height) + 0.05
        } else {
          // complex content (contains block-level elements like codeBlock/image/blockMath): prefix as independent label + recursive render content
          if (ctx.currentY + 0.3 > ctx.maxY) newSlide(ctx, pres)
          ctx.slide.addText(prefix, {
            x: ctx.marginX + 0.3, y: ctx.currentY, w: 0.5, h: 0.3,
            fontSize: BODY_FONT_SIZE, bold: true, fontFace: 'Calibri', valign: 'top',
          })
          const savedMarginX = ctx.marginX
          const savedContentWidth = ctx.contentWidth
          ctx.marginX = savedMarginX + 0.8
          ctx.contentWidth = savedContentWidth - 0.8
          renderTiptapContent(ctx, opt, pres, 0)
          ctx.marginX = savedMarginX
          ctx.contentWidth = savedContentWidth
        }
      }
    } else if (type === 'classify') {
      for (let i = 0; i < options.length; i++) {
        const cat = options[i]
        const catName = cat?.name || `Category ${i + 1}`
        const items = Array.isArray(cat?.items) ? cat.items.join(', ') : ''
        if (ctx.currentY + 0.3 > ctx.maxY) newSlide(ctx, pres)
        ctx.slide.addText(`  ${catName}: ${items}`, {
          x: ctx.marginX, y: ctx.currentY, w: ctx.contentWidth, h: 0.3,
          fontSize: BODY_FONT_SIZE, fontFace: 'Calibri', valign: 'top',
        })
        ctx.currentY += 0.32
      }
    } else if (type === 'match') {
      for (let i = 0; i < options.length; i++) {
        const pair = options[i]
        if (ctx.currentY + 0.3 > ctx.maxY) newSlide(ctx, pres)
        ctx.slide.addText(`  ${pair?.left || ''} ↔ ${pair?.right || ''}`, {
          x: ctx.marginX, y: ctx.currentY, w: ctx.contentWidth, h: 0.3,
          fontSize: BODY_FONT_SIZE, fontFace: 'Calibri', valign: 'top',
        })
        ctx.currentY += 0.32
      }
    }
    // fill/judge/short-answer/html/puzzle/video/evaluation/composite do not need to render option list
  }

  // ── correct answer ──
  const answerText = formatQuestionAnswer(questionData)
  if (answerText) {
    if (ctx.currentY + 0.35 > ctx.maxY) newSlide(ctx, pres)
    ctx.slide.addText([
      { text: '✓ Answer: ', options: { bold: true, color: '22863A', fontSize: BODY_FONT_SIZE } },
      { text: answerText, options: { color: '22863A', fontSize: BODY_FONT_SIZE } },
    ], {
      x: ctx.marginX, y: ctx.currentY, w: ctx.contentWidth, h: 0.3,
      fontFace: 'Calibri', valign: 'top',
    })
    ctx.currentY += 0.35
  }

  // ── answer explanation ──
  const explanation = questionData.explanation
  if (explanation && typeof explanation === 'string' && explanation.trim()) {
    const height = estimateTextHeight(explanation, ctx.contentWidth - 0.3, BODY_FONT_SIZE - 1, BODY_LINE_HEIGHT)
    if (ctx.currentY + height + 0.1 > ctx.maxY) newSlide(ctx, pres)
    ctx.slide.addText([
      { text: '💡 ', options: { fontSize: BODY_FONT_SIZE - 1 } },
      { text: explanation, options: { italic: true, color: '666666', fontSize: BODY_FONT_SIZE - 1 } },
    ], {
      x: ctx.marginX, y: ctx.currentY, w: ctx.contentWidth, h: height + 0.1,
      fontFace: 'Calibri', lineSpacingMultiple: BODY_LINE_HEIGHT, valign: 'top',
    })
    ctx.currentY += height + 0.15
  }

  ctx.currentY += 0.15

  // draw group border: all child elements (label/content/options/answer/explanation) visually form a whole
  addGroupBorder(ctx, groupStartSlide, groupStartY, groupMarginX, groupContentWidth)
}

// ═══════════════════════════════════════
// Node rendering (core)
// ═══════════════════════════════════════

export function addNodeToSlide(ctx: SlideContext, node: any, pres: any, indentLevel = 0): void {
  if (!node || !node.type) return
  const { type, attrs = {}, content = [] } = node

  switch (type) {
    // ── heading ──
    case 'heading': {
      const level = attrs.level || 1
      const text = extractPlainText(node)
      if (!text) break

      if (level <= 2) {
        // h1/h2 → new page, heading as page title
        newSlide(ctx, pres, text)
      } else {
        // h3-h6 → in-page subheading
        const fontSize = HEADING_FONT_SIZES[level] || 14
        const height = 0.45
        if (ctx.currentY + height + 0.1 > ctx.maxY) {
          newSlide(ctx, pres)
        }
        const align = attrs.textAlign === 'center' ? 'center'
          : attrs.textAlign === 'right' ? 'right' : 'left'
        ctx.slide.addText(text, {
          x: ctx.marginX + indentLevel * 0.3,
          y: ctx.currentY,
          w: ctx.contentWidth - indentLevel * 0.3,
          h: height,
          fontSize,
          bold: true,
          color: '333333',
          fontFace: 'Calibri',
          align: align as any,
        })
        ctx.currentY += height + 0.1
      }
      break
    }

    // ── paragraph ──
    case 'paragraph': {
      const runs = extractTextRuns(content, ctx.inlineMathCache)
      const text = extractPlainText(node)
      if (!text.trim() && runs.length === 0) {
        ctx.currentY += 0.2
        break
      }
      const indent = indentLevel * 0.3
      const width = ctx.contentWidth - indent
      const height = estimateTextHeight(text, width, BODY_FONT_SIZE, BODY_LINE_HEIGHT)

      if (ctx.currentY + height + 0.1 > ctx.maxY) {
        newSlide(ctx, pres)
      }

      const align = attrs.textAlign === 'center' ? 'center'
        : attrs.textAlign === 'right' ? 'right'
        : attrs.textAlign === 'justify' ? 'justify'
        : 'left'

      ctx.slide.addText(runs.length ? runs : text, {
        x: ctx.marginX + indent,
        y: ctx.currentY,
        w: width,
        h: height + 0.1,
        fontSize: BODY_FONT_SIZE,
        align: align as any,
        fontFace: 'Calibri',
        lineSpacingMultiple: attrs.lineHeight || BODY_LINE_HEIGHT,
        valign: 'top',
      })
      ctx.currentY += height + 0.12
      break
    }

    // ── code block (syntax highlighting + auto pagination) ──
    case 'codeBlock': {
      const code = extractPlainText(node)
      if (!code) break
      const language = attrs.language || 'plaintext'

      // get highlighted runs (with colors), then split by lines for pagination
      const highlightedRuns = highlightCodeToRuns(code, language)
      const allLines = splitRunsByLines(highlightedRuns)

      const lineHeightIn = (CODE_FONT_SIZE * CODE_LINE_HEIGHT) / 72
      const padding = 0.1
      const bgColor = 'F8FAFC'

      const remaining = [...allLines]
      while (remaining.length > 0) {
        const availH = ctx.maxY - ctx.currentY
        // current page cannot fit at least 2 lines → new page
        if (availH < lineHeightIn * 2 + padding * 2) {
          newSlide(ctx, pres)
          continue
        }
        const maxLines = Math.floor((availH - padding * 2) / lineHeightIn)
        const chunkLines = remaining.splice(0, maxLines)
        const h = chunkLines.length * lineHeightIn + padding * 2

        // flatten line runs to pptxgenjs text runs, add breakLine at end of each line
        const runs: any[] = []
        for (let li = 0; li < chunkLines.length; li++) {
          const lineRuns = chunkLines[li] || []
          const isLastLine = li === chunkLines.length - 1
          if (lineRuns.length === 0) {
            // empty line
            runs.push({
              text: ' ',
              options: { breakLine: !isLastLine, fontSize: CODE_FONT_SIZE, fontFace: 'Courier New', color: CODE_DEFAULT_COLOR },
            })
          } else {
            for (let ri = 0; ri < lineRuns.length; ri++) {
              const run = lineRuns[ri]
              const isLastRunOfLine = ri === lineRuns.length - 1
              runs.push({
                text: run.text,
                options: {
                  ...run.options,
                  fontSize: CODE_FONT_SIZE,
                  fontFace: 'Courier New',
                  breakLine: isLastRunOfLine && !isLastLine,
                },
              })
            }
          }
        }

        ctx.slide.addText(runs, {
          x: ctx.marginX,
          y: ctx.currentY,
          w: ctx.contentWidth,
          h,
          fontSize: CODE_FONT_SIZE,
          fontFace: 'Courier New',
          fill: { color: bgColor },
          lineSpacingMultiple: CODE_LINE_HEIGHT,
          valign: 'top',
        })
        ctx.currentY += h + 0.1
      }
      break
    }

    // ── image ──
    case 'image':
    case 'inlineImage': {
      const src = attrs.src
      if (!src) break
      const maxW = ctx.contentWidth * 0.8
      const availH = ctx.maxY - ctx.currentY - 0.2
      const w = Math.min(maxW, 8)
      const h = Math.min(Math.max(availH, 2), 4.5)

      if (availH < 2) {
        newSlide(ctx, pres)
      }

      const imgOpts: any = {
        x: ctx.marginX + (ctx.contentWidth - w) / 2,
        y: ctx.currentY,
        w,
        h,
        sizing: { type: 'contain', w, h },
      }
      if (src.startsWith('data:')) {
        imgOpts.data = src
      } else {
        imgOpts.path = src
      }
      try {
        ctx.slide.addImage(imgOpts)
        ctx.currentY += h + 0.15
      } catch {
        // image load failed → placeholder text
        ctx.slide.addText(`[Image: ${src.substring(0, 50)}...]`, {
          x: ctx.marginX,
          y: ctx.currentY,
          w: ctx.contentWidth,
          h: 0.35,
          fontSize: 12,
          italic: true,
          color: '999999',
          fontFace: 'Calibri',
        })
        ctx.currentY += 0.4
      }
      break
    }

    // ── unordered/ordered list ──
    case 'bulletList':
    case 'orderedList': {
      const listType = type === 'orderedList' ? 'ordered' : 'bullet'
      const items = flattenListItems(node, indentLevel, listType, ctx.inlineMathCache)
      addListItems(ctx, items, pres)
      break
    }

    // ── task list ──
    case 'taskList': {
      const items = flattenTaskItems(node, indentLevel, ctx.inlineMathCache)
      addListItems(ctx, items, pres)
      break
    }

    // ── table ──
    case 'table': {
      const { rows, colCount } = buildTableRows(node)
      if (rows.length === 0 || colCount === 0) break

      const rowH = 0.35
      const tableH = rows.length * rowH
      if (ctx.currentY + tableH > ctx.maxY) {
        newSlide(ctx, pres)
      }

      const colW = ctx.contentWidth / colCount
      ctx.slide.addTable(rows, {
        x: ctx.marginX,
        y: ctx.currentY,
        w: ctx.contentWidth,
        colW: Array(colCount).fill(colW),
        rowH,
        border: { type: 'solid', color: 'CFCFCF', pt: 1 },
        fontFace: 'Calibri',
        fontSize: 12,
        valign: 'middle',
      })
      ctx.currentY += tableH + 0.2
      break
    }

    // ── blockquote ──
    case 'blockquote': {
      const indent = 0.4 + indentLevel * 0.3
      const width = ctx.contentWidth - indent
      const runs: any[] = []
      for (const c of content) {
        if (c.type === 'paragraph') {
          runs.push(...extractTextRuns(c.content || [], ctx.inlineMathCache))
        }
      }
      const text = runs.map((r: any) => r.text).join('')
      const height = estimateTextHeight(text, width, BODY_FONT_SIZE, BODY_LINE_HEIGHT)

      if (ctx.currentY + height + 0.2 > ctx.maxY) {
        newSlide(ctx, pres)
      }

      // left vertical line
      ctx.slide.addShape('rect', {
        x: ctx.marginX + indentLevel * 0.3,
        y: ctx.currentY,
        w: 0.05,
        h: height + 0.2,
        fill: { color: 'CCCCCC' },
      })

      ctx.slide.addText(runs, {
        x: ctx.marginX + indent,
        y: ctx.currentY,
        w: width,
        h: height + 0.1,
        fontSize: BODY_FONT_SIZE,
        italic: true,
        color: '666666',
        fontFace: 'Calibri',
        lineSpacingMultiple: BODY_LINE_HEIGHT,
        valign: 'top',
      })
      ctx.currentY += height + 0.25
      break
    }

    // ── callout ──
    case 'callout': {
      const bgColor = cssColorToHex(attrs.backgroundColor) || 'FFF3CD'
      const fontColor = cssColorToHex(attrs.fontColor) || '856404'
      const icon = attrs.icon || '💡'
      const runs: any[] = []
      for (const c of content) {
        if (c.type === 'paragraph') {
          runs.push(...extractTextRuns(c.content || [], ctx.inlineMathCache))
        }
      }
      const text = icon + ' ' + runs.map((r: any) => r.text).join('')
      const height = estimateTextHeight(text, ctx.contentWidth - 0.3, BODY_FONT_SIZE, BODY_LINE_HEIGHT)

      if (ctx.currentY + height + 0.3 > ctx.maxY) {
        newSlide(ctx, pres)
      }

      ctx.slide.addShape('roundRect', {
        x: ctx.marginX,
        y: ctx.currentY,
        w: ctx.contentWidth,
        h: height + 0.3,
        fill: { color: bgColor },
        line: { color: bgColor, width: 0 },
        rectRadius: 0.05,
      })
      ctx.slide.addText(text, {
        x: ctx.marginX + 0.15,
        y: ctx.currentY + 0.15,
        w: ctx.contentWidth - 0.3,
        h: height,
        fontSize: BODY_FONT_SIZE,
        color: fontColor,
        fontFace: 'Calibri',
        lineSpacingMultiple: BODY_LINE_HEIGHT,
        valign: 'top',
      })
      ctx.currentY += height + 0.35
      break
    }

    // ── horizontal rule ──
    case 'horizontalRule': {
      if (ctx.currentY + 0.2 > ctx.maxY) {
        newSlide(ctx, pres)
      }
      const color = cssColorToHex(attrs.color) || 'CCCCCC'
      ctx.slide.addShape('line', {
        x: ctx.marginX,
        y: ctx.currentY + 0.1,
        w: ctx.contentWidth,
        h: 0,
        line: { color, width: 1 },
      })
      ctx.currentY += 0.25
      break
    }

    // ── page break ──
    case 'pageBreak': {
      newSlide(ctx, pres)
      break
    }

    // ── math formula (block-level → KaTeX pre-rendered image, fallback to LaTeX source on failure) ──
    case 'blockMath': {
      const latex = attrs.latex || ''
      if (!latex) break
      const mathImg = ctx.blockMathCache.get(latex)
      if (mathImg) {
        // render as centered image
        if (ctx.currentY + mathImg.height + 0.2 > ctx.maxY) {
          newSlide(ctx, pres)
        }
        const x = ctx.marginX + (ctx.contentWidth - mathImg.width) / 2
        ctx.slide.addImage({
          data: mathImg.dataUrl,
          x,
          y: ctx.currentY,
          w: mathImg.width,
          h: mathImg.height,
          sizing: { type: 'contain', w: mathImg.width, h: mathImg.height },
        })
        ctx.currentY += mathImg.height + 0.2
      } else {
        // fallback: directly display LaTeX source (KaTeX textContent extraction loses super/subscript format, source is more readable)
        if (ctx.currentY + 0.6 > ctx.maxY) {
          newSlide(ctx, pres)
        }
        ctx.slide.addText(latex, {
          x: ctx.marginX,
          y: ctx.currentY,
          w: ctx.contentWidth,
          h: 0.5,
          fontSize: 14,
          fontFace: 'Cambria Math',
          italic: true,
          align: 'center',
          color: '333333',
        })
        ctx.currentY += 0.6
      }
      break
    }

    // inlineMath is already processed by extractTextRuns in paragraph (replaced with Unicode text), not handled separately
    case 'inlineMath':
      break

    // ── video/audio/file/iframe → placeholder text ──
    case 'video':
    case 'audio':
    case 'file':
    case 'iframe': {
      const label = `[${type}: ${attrs.src || attrs.href || ''}]`
      if (ctx.currentY + 0.4 > ctx.maxY) {
        newSlide(ctx, pres)
      }
      ctx.slide.addText(label, {
        x: ctx.marginX,
        y: ctx.currentY,
        w: ctx.contentWidth,
        h: 0.35,
        fontSize: 12,
        italic: true,
        color: '999999',
        fontFace: 'Calibri',
      })
      ctx.currentY += 0.4
      break
    }

    // ── ECharts chart → pre-rendered image (fallback placeholder text) ──
    case 'echarts': {
      const img = ctx.echartsCache.get(node)
      if (addCachedImage(ctx, img, pres)) break
      // fallback: placeholder text
      addPlaceholderLabel(ctx, '[Chart]', pres)
      break
    }

    // ── datetime → render text ──
    case 'datetime': {
      const text = attrs.text || ''
      if (!text) break
      if (ctx.currentY + 0.3 > ctx.maxY) newSlide(ctx, pres)
      ctx.slide.addText(text, {
        x: ctx.marginX, y: ctx.currentY, w: ctx.contentWidth, h: 0.3,
        fontSize: BODY_FONT_SIZE, fontFace: 'Calibri', valign: 'top',
      })
      ctx.currentY += 0.35
      break
    }

    // ── @mention → render @label ──
    case 'mention': {
      const label = attrs.label || ''
      if (!label) break
      if (ctx.currentY + 0.3 > ctx.maxY) newSlide(ctx, pres)
      ctx.slide.addText(`@${label}`, {
        x: ctx.marginX, y: ctx.currentY, w: ctx.contentWidth, h: 0.3,
        fontSize: BODY_FONT_SIZE, color: '2B579A', fontFace: 'Calibri', valign: 'top',
      })
      ctx.currentY += 0.35
      break
    }

    // ── tag → render text with color ──
    case 'tag': {
      const text = attrs.text || ''
      if (!text) break
      const color = cssColorToHex(attrs.color) || '333333'
      const bgColor = cssColorToHex(attrs.backgroundColor) || 'EEEEEE'
      if (ctx.currentY + 0.3 > ctx.maxY) newSlide(ctx, pres)
      ctx.slide.addText(text, {
        x: ctx.marginX, y: ctx.currentY, w: ctx.contentWidth, h: 0.3,
        fontSize: BODY_FONT_SIZE, color, fill: { color: bgColor },
        fontFace: 'Calibri', valign: 'top',
      })
      ctx.currentY += 0.35
      break
    }

    // ── collapsible panel → render summary + content ──
    case 'details': {
      for (const c of content) {
        if (c.type === 'detailsSummary') {
          const text = extractPlainText(c)
          if (ctx.currentY + 0.4 > ctx.maxY) newSlide(ctx, pres)
          ctx.slide.addText(text, {
            x: ctx.marginX + indentLevel * 0.3,
            y: ctx.currentY,
            w: ctx.contentWidth - indentLevel * 0.3,
            h: 0.35,
            fontSize: BODY_FONT_SIZE,
            bold: true,
            color: '333333',
            fontFace: 'Calibri',
          })
          ctx.currentY += 0.4
        } else if (c.type === 'detailsContent') {
          for (const cc of c.content || []) {
            addNodeToSlide(ctx, cc, pres, indentLevel)
          }
        } else {
          addNodeToSlide(ctx, c, pres, indentLevel)
        }
      }
      break
    }

    // ── text box → text with border ──
    case 'textBox': {
      const runs = extractTextRuns(content, ctx.inlineMathCache)
      const text = extractPlainText(node)
      const height = estimateTextHeight(text, ctx.contentWidth - 0.3, BODY_FONT_SIZE, BODY_LINE_HEIGHT)
      if (ctx.currentY + height + 0.2 > ctx.maxY) {
        newSlide(ctx, pres)
      }
      ctx.slide.addShape('roundRect', {
        x: ctx.marginX,
        y: ctx.currentY,
        w: ctx.contentWidth,
        h: height + 0.2,
        fill: { color: 'F9F9F9' },
        line: { color: 'DDDDDD', width: 1 },
        rectRadius: 0.05,
      })
      ctx.slide.addText(runs.length ? runs : text, {
        x: ctx.marginX + 0.15,
        y: ctx.currentY + 0.1,
        w: ctx.contentWidth - 0.3,
        h: height,
        fontSize: BODY_FONT_SIZE,
        fontFace: 'Calibri',
        valign: 'top',
      })
      ctx.currentY += height + 0.25
      break
    }

    // ── column container → render child nodes sequentially ──
    case 'columnContainer':
    case 'column': {
      for (const c of content) {
        addNodeToSlide(ctx, c, pres, indentLevel)
      }
      break
    }

    // ── footnotes → render as small text ──
    case 'footnotes': {
      for (const c of content) {
        addNodeToSlide(ctx, c, pres, indentLevel)
      }
      break
    }

    case 'footnote': {
      const text = extractPlainText(node)
      if (!text) break
      if (ctx.currentY + 0.3 > ctx.maxY) newSlide(ctx, pres)
      ctx.slide.addText(text, {
        x: ctx.marginX,
        y: ctx.currentY,
        w: ctx.contentWidth,
        h: 0.25,
        fontSize: 10,
        color: '999999',
        fontFace: 'Calibri',
      })
      ctx.currentY += 0.3
      break
    }

    // ── Vue custom nodes (question / quiz / homework / race / tabs / mindmap / html etc.) ──
    case 'vue': {
      const vueType = attrs.type
      switch (vueType) {
        case 'question': {
          const c = attrs.content
          let questionData: any = null
          if (c != null && typeof c === 'object' && !Array.isArray(c)) {
            // inline question object (AI-generated unsaved question)
            questionData = c
          } else {
            // cid string/number → get from pre-fetched cache
            const cid = Number(c) || 0
            if (cid > 0) {
              questionData = ctx.questionCache.get(cid)
            }
          }
          if (questionData) {
            addQuestionToSlide(ctx, questionData, pres)
          } else {
            // question data not retrieved (cid invalid or API failed) → placeholder
            addPlaceholderLabel(ctx, `[Question: ${attrs.content}]`, pres)
          }
          break
        }
        case 'quiz':
          addQuizToSlide(ctx, attrs.content, pres)
          break
        case 'homework':
          addHomeworkToSlide(ctx, attrs.content, pres)
          break
        case 'race':
          addRaceToSlide(ctx, attrs.content, pres)
          break
        case 'tabs':
          addTabsToSlide(ctx, attrs.content, pres)
          break
        case 'mindmap':
          addMindmapToSlide(ctx, attrs.content, pres)
          break
        case 'html':
          addHtmlToSlide(ctx, attrs.content, pres)
          break
        default:
          // sheet/aichat/aigenerator/chatroom/comment/condition/counter/timer/vfiles/office/pdf → placeholder
          addPlaceholderLabel(ctx, `[${vueType || 'vue'}]`, pres)
          break
      }
      break
    }

    // ── interactive components → skip ──
    case 'toc':
    case 'inputs':
    case 'select':
    case 'optionBox':
      break

    // ── other types → try rendering child nodes ──
    default: {
      if (content && content.length > 0) {
        for (const c of content) {
          addNodeToSlide(ctx, c, pres, indentLevel)
        }
      }
      break
    }
  }
}
