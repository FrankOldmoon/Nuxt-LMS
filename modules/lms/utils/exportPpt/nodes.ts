/**
 * 核心节点渲染器
 * 将 Tiptap JSON 各节点类型渲染到 pptxgenjs 幻灯片
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
// Tiptap 内容通用渲染
// ═══════════════════════════════════════

/**
 * 渲染 Tiptap 内容到幻灯片
 * - 字符串 → markdownToTiptap 转 Tiptap JSON 后递归渲染（与 ueditorRender 行为一致）
 * - Tiptap doc 对象 → 递归 addNodeToSlide
 * - 单个节点（paragraph/codeBlock 等）→ 直接 addNodeToSlide
 * - 节点数组 → 逐个 addNodeToSlide
 */
function renderTiptapContent(ctx: SlideContext, content: any, pres: any, indentLevel = 0): void {
  if (!content) return
  if (typeof content === 'string') {
    // 字符串 → markdown 转 Tiptap JSON 后递归渲染（与 ueditorRender 行为一致）
    if (!content.trim()) return
    const tiptap = markdownToTiptap(content)
    renderTiptapContent(ctx, tiptap, pres, indentLevel)
  } else if (typeof content === 'object') {
    if (Array.isArray(content)) {
      // 节点数组 → 逐个渲染
      for (const c of content) {
        if (c && typeof c === 'object') addNodeToSlide(ctx, c, pres, indentLevel)
      }
    } else if (content.type === 'doc') {
      // doc 对象 → 递归渲染 content 数组
      for (const c of content.content || []) {
        addNodeToSlide(ctx, c, pres, indentLevel)
      }
    } else if (content.type) {
      // 单个节点（paragraph/codeBlock 等）→ 直接渲染
      addNodeToSlide(ctx, content, pres, indentLevel)
    }
  }
}

/** 将图片（MathImage）居中渲染到幻灯片，返回是否成功 */
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

/** 占位标签渲染（交互式/复杂类型） */
function addPlaceholderLabel(ctx: SlideContext, label: string, pres: any): void {
  if (ctx.currentY + 0.35 > ctx.maxY) newSlide(ctx, pres)
  ctx.slide.addText(label, {
    x: ctx.marginX, y: ctx.currentY, w: ctx.contentWidth, h: 0.3,
    fontSize: 12, italic: true, color: '999999', fontFace: 'Calibri',
  })
  ctx.currentY += 0.35
}

// ═══════════════════════════════════════
// 分组边框（模拟 PPT group — pptxgenjs 不支持原生 group）
// ═══════════════════════════════════════

/** 分组边框样式（匹配编辑器 question 的 border-gray-200 + rounded-lg + p-4） */
const GROUP_BORDER_COLOR = 'D1D5DB'   // gray-300（PPT 中比 gray-200 更清晰）
const GROUP_BORDER_WIDTH = 1          // pt
const GROUP_BORDER_RADIUS = 0.06      // 英寸，小圆角
const GROUP_PADDING = 0.12            // 英寸，内边距

/**
 * 在已渲染内容周围绘制边框，使所有子元素视觉上组成一个 group。
 *
 * 实现要点：
 * - 边框在内容渲染**之后**添加（z-order 在上层）
 * - 使用 fill: { type: 'none' } 透明填充，不遮挡已渲染的内容，仅边框线可见
 * - 支持单页（一个 roundRect）和跨页（首页到底部 + 末页从顶部）两种情况
 *
 * @param startSlide    渲染开始时的幻灯片对象
 * @param startY        渲染开始时的 Y 坐标
 * @param marginX       渲染开始时的左边距（选项缩进会临时改变 marginX，需用初始值）
 * @param contentWidth  渲染开始时的内容宽度
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
    // 单页：从 startY 到 endY
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
    // 跨页：首页从 startY 到幻灯片底部
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
    // 末页从顶部到 endY
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
// Vue 扩展类型渲染（quiz/homework/race/tabs/mindmap/html）
// ═══════════════════════════════════════

/** quiz 测验：标签 + 名称 + 时间 + content(Tiptap) + 嵌套题目 */
function addQuizToSlide(ctx: SlideContext, cidContent: any, pres: any): void {
  const cid = Number(cidContent) || 0
  const quiz = cid > 0 ? ctx.quizCache.get(cid) : null
  if (!quiz) {
    addPlaceholderLabel(ctx, `[Quiz: ${cidContent}]`, pres)
    return
  }

  newSlide(ctx, pres)
  // 标签 + 名称
  ctx.slide.addText([
    { text: '[Quiz] ', options: { bold: true, color: 'D97706', fontSize: 15 } },
    { text: quiz.name || '', options: { bold: true, color: '333333', fontSize: 15 } },
  ], {
    x: ctx.marginX, y: ctx.currentY, w: ctx.contentWidth, h: 0.4,
    fontFace: 'Calibri', valign: 'top',
  })
  ctx.currentY += 0.45

  // 时间信息
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

  // 测验内容（Tiptap）
  renderTiptapContent(ctx, quiz.content, pres, 0)

  // 嵌套题目（复用 addQuestionToSlide）
  const questionCids = extractQuizQuestionCids(quiz)
  for (const qid of questionCids) {
    const qData = ctx.questionCache.get(qid)
    if (qData) addQuestionToSlide(ctx, qData, pres)
  }
}

/** homework 作业：标签 + 名称 + code + content(Tiptap) + tags + explanation */
function addHomeworkToSlide(ctx: SlideContext, cidContent: any, pres: any): void {
  const cid = Number(cidContent) || 0
  const hw = cid > 0 ? ctx.homeworkCache.get(cid) : null
  if (!hw) {
    addPlaceholderLabel(ctx, `[Homework: ${cidContent}]`, pres)
    return
  }

  newSlide(ctx, pres)
  // 标签 + 名称 + code
  ctx.slide.addText([
    { text: '[Homework] ', options: { bold: true, color: '7C3AED', fontSize: 15 } },
    { text: hw.name || '', options: { bold: true, color: '333333', fontSize: 15 } },
    { text: hw.code ? `  ${hw.code}` : '', options: { color: '999999', fontSize: 12, fontFace: 'Courier New' } },
  ], {
    x: ctx.marginX, y: ctx.currentY, w: ctx.contentWidth, h: 0.4,
    fontFace: 'Calibri', valign: 'top',
  })
  ctx.currentY += 0.45

  // 作业内容（Tiptap）
  renderTiptapContent(ctx, hw.content, pres, 0)

  // 标签
  if (Array.isArray(hw.tags) && hw.tags.length > 0) {
    const tagText = hw.tags.join('  |  ')
    if (ctx.currentY + 0.3 > ctx.maxY) newSlide(ctx, pres)
    ctx.slide.addText(`Tags: ${tagText}`, {
      x: ctx.marginX, y: ctx.currentY, w: ctx.contentWidth, h: 0.3,
      fontSize: 11, color: '666666', fontFace: 'Calibri', valign: 'top',
    })
    ctx.currentY += 0.32
  }

  // 答案解析
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

/** race 竞赛：标签 + 名称 + 嵌套题目 */
function addRaceToSlide(ctx: SlideContext, cidContent: any, pres: any): void {
  const cid = Number(cidContent) || 0
  const race = cid > 0 ? ctx.raceCache.get(cid) : null
  if (!race) {
    addPlaceholderLabel(ctx, `[Race: ${cidContent}]`, pres)
    return
  }

  newSlide(ctx, pres)
  // 标签 + 名称
  ctx.slide.addText([
    { text: '[Race] ', options: { bold: true, color: 'DC2626', fontSize: 15 } },
    { text: race.name || '', options: { bold: true, color: '333333', fontSize: 15 } },
  ], {
    x: ctx.marginX, y: ctx.currentY, w: ctx.contentWidth, h: 0.4,
    fontFace: 'Calibri', valign: 'top',
  })
  ctx.currentY += 0.45

  // 嵌套题目
  const questionCids = extractRaceQuestionCids(race)
  for (const qid of questionCids) {
    const qData = ctx.questionCache.get(qid)
    if (qData) addQuestionToSlide(ctx, qData, pres)
  }
}

/** tabs 标签页：每个 tab 新页，标签 + content(Tiptap) */
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
    // tab 标签
    ctx.slide.addText([
      { text: '[Tab] ', options: { bold: true, color: '2B579A', fontSize: 15 } },
      { text: tab.label || '', options: { bold: true, color: '333333', fontSize: 15 } },
    ], {
      x: ctx.marginX, y: ctx.currentY, w: ctx.contentWidth, h: 0.4,
      fontFace: 'Calibri', valign: 'top',
    })
    ctx.currentY += 0.45
    // tab 内容（Tiptap）
    renderTiptapContent(ctx, tab.content, pres, 0)
  }
}

/** mindmap 思维导图：使用预渲染的 mindmapCache 图片 */
function addMindmapToSlide(ctx: SlideContext, markdown: any, pres: any): void {
  if (typeof markdown !== 'string' || !markdown) {
    addPlaceholderLabel(ctx, '[Mindmap]', pres)
    return
  }
  const img = ctx.mindmapCache.get(markdown)
  if (addCachedImage(ctx, img, pres)) return
  // 回退：markdown 源码文本
  if (ctx.currentY + 0.4 > ctx.maxY) newSlide(ctx, pres)
  ctx.slide.addText(`[Mindmap]\n${markdown.substring(0, 200)}`, {
    x: ctx.marginX, y: ctx.currentY, w: ctx.contentWidth, h: 0.35,
    fontSize: 12, italic: true, color: '999999', fontFace: 'Calibri',
  })
  ctx.currentY += 0.4
}

/** html 块：使用预渲染的 htmlCache 图片 */
function addHtmlToSlide(ctx: SlideContext, html: any, pres: any): void {
  if (typeof html !== 'string' || !html) {
    addPlaceholderLabel(ctx, '[HTML Block]', pres)
    return
  }
  const img = ctx.htmlCache.get(html)
  if (addCachedImage(ctx, img, pres)) return
  // 回退：占位
  addPlaceholderLabel(ctx, '[HTML Block]', pres)
}

// ═══════════════════════════════════════
// 题目渲染（vue question 节点）
// ═══════════════════════════════════════

/** 将一道题目渲染到幻灯片（题目标签+名称、内容、选项、答案、解析） */
export function addQuestionToSlide(ctx: SlideContext, questionData: any, pres: any): void {
  if (!questionData) return

  const type = questionData.type || 'single'
  const name = questionData.name || ''
  const typeLabel = QUESTION_TYPE_LABELS[type] || type

  // 题目在新页渲染（保持独立性）
  if (ctx.currentY > ctx.startY + 0.1) {
    newSlide(ctx, pres)
  }

  // 记录起始位置（用于绘制 group 边框 — question 在编辑器中有 border，PPT 中也保留）
  const groupStartSlide = ctx.slide
  const groupStartY = ctx.currentY
  const groupMarginX = ctx.marginX
  const groupContentWidth = ctx.contentWidth

  // ── 题目标签 + 名称 ──
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

  // ── 题目内容（Tiptap JSON 或 markdown 字符串 → 递归渲染） ──
  renderTiptapContent(ctx, questionData.content, pres, 0)

  // ── 选项（选择题/排序题/分类题/连线题） ──
  const options = questionData.options
  if (Array.isArray(options) && options.length > 0) {
    if (type === 'single' || type === 'multiple' || type === 'select' || type === 'sort') {
      for (let i = 0; i < options.length; i++) {
        const opt = options[i]
        const prefix = `${String.fromCharCode(65 + i)}. `

        // 解析选项为 Tiptap 节点数组（字符串 → markdownToTiptap，Tiptap JSON → 直接取 content）
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

        // 判断是否为简单内容（仅 paragraph/text/hardBreak，无 block 级元素如 codeBlock/image/blockMath）
        const isInlineOnly = optNodes.every((n: any) =>
          n.type === 'paragraph' || n.type === 'text' || n.type === 'hardBreak',
        )

        if (isInlineOnly) {
          // 简单内容：字母前缀 + 内容合并到同一个文本框（用户要求 ABCD 字母和内容在一起）
          if (ctx.currentY + 0.3 > ctx.maxY) newSlide(ctx, pres)
          // 收集所有 paragraph 的 inline 子节点
          const inlineNodes: any[] = []
          for (const n of optNodes) {
            if (n.type === 'paragraph' && Array.isArray(n.content)) {
              inlineNodes.push(...n.content)
            } else if (n.type === 'text' || n.type === 'hardBreak') {
              inlineNodes.push(n)
            }
          }
          const runs = extractTextRuns(inlineNodes, ctx.inlineMathCache)
          // 前缀作为第一个 run（粗体）
          runs.unshift({ text: prefix, options: { bold: true, fontSize: BODY_FONT_SIZE, fontFace: 'Calibri' } })
          const plainText = runs.map((r: any) => r.text).join('')
          const height = estimateTextHeight(plainText, ctx.contentWidth - 0.3, BODY_FONT_SIZE, BODY_LINE_HEIGHT)
          ctx.slide.addText(runs, {
            x: ctx.marginX + 0.3, y: ctx.currentY, w: ctx.contentWidth - 0.3, h: Math.max(0.3, height),
            fontFace: 'Calibri', valign: 'top', lineSpacingMultiple: BODY_LINE_HEIGHT,
          })
          ctx.currentY += Math.max(0.3, height) + 0.05
        } else {
          // 复杂内容（含 codeBlock/image/blockMath 等 block 级元素）：前缀独立标签 + 递归渲染内容
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
    // fill/judge/short-answer/html/puzzle/video/evaluation/composite 无需渲染选项列表
  }

  // ── 正确答案 ──
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

  // ── 答案解析 ──
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

  // 绘制 group 边框：所有子元素（标签/内容/选项/答案/解析）视觉上组成一个整体
  addGroupBorder(ctx, groupStartSlide, groupStartY, groupMarginX, groupContentWidth)
}

// ═══════════════════════════════════════
// 节点渲染（核心）
// ═══════════════════════════════════════

export function addNodeToSlide(ctx: SlideContext, node: any, pres: any, indentLevel = 0): void {
  if (!node || !node.type) return
  const { type, attrs = {}, content = [] } = node

  switch (type) {
    // ── 标题 ──
    case 'heading': {
      const level = attrs.level || 1
      const text = extractPlainText(node)
      if (!text) break

      if (level <= 2) {
        // h1/h2 → 新页，标题作为页标题
        newSlide(ctx, pres, text)
      } else {
        // h3-h6 → 当前页内子标题
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

    // ── 段落 ──
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

    // ── 代码块（语法高亮 + 自动分页） ──
    case 'codeBlock': {
      const code = extractPlainText(node)
      if (!code) break
      const language = attrs.language || 'plaintext'

      // 获取高亮 runs（带颜色），再按行拆分用于分页
      const highlightedRuns = highlightCodeToRuns(code, language)
      const allLines = splitRunsByLines(highlightedRuns)

      const lineHeightIn = (CODE_FONT_SIZE * CODE_LINE_HEIGHT) / 72
      const padding = 0.1
      const bgColor = 'F8FAFC'

      const remaining = [...allLines]
      while (remaining.length > 0) {
        const availH = ctx.maxY - ctx.currentY
        // 当前页放不下至少 2 行 → 换新页
        if (availH < lineHeightIn * 2 + padding * 2) {
          newSlide(ctx, pres)
          continue
        }
        const maxLines = Math.floor((availH - padding * 2) / lineHeightIn)
        const chunkLines = remaining.splice(0, maxLines)
        const h = chunkLines.length * lineHeightIn + padding * 2

        // 将行 runs 展平为 pptxgenjs text runs，每行末尾加 breakLine
        const runs: any[] = []
        for (let li = 0; li < chunkLines.length; li++) {
          const lineRuns = chunkLines[li] || []
          const isLastLine = li === chunkLines.length - 1
          if (lineRuns.length === 0) {
            // 空行
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

    // ── 图片 ──
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
        // 图片加载失败 → 占位文本
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

    // ── 无序/有序列表 ──
    case 'bulletList':
    case 'orderedList': {
      const listType = type === 'orderedList' ? 'ordered' : 'bullet'
      const items = flattenListItems(node, indentLevel, listType, ctx.inlineMathCache)
      addListItems(ctx, items, pres)
      break
    }

    // ── 任务列表 ──
    case 'taskList': {
      const items = flattenTaskItems(node, indentLevel, ctx.inlineMathCache)
      addListItems(ctx, items, pres)
      break
    }

    // ── 表格 ──
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

    // ── 引用块 ──
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

      // 左侧竖线
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

    // ── 提示框 ──
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

    // ── 分隔线 ──
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

    // ── 分页符 ──
    case 'pageBreak': {
      newSlide(ctx, pres)
      break
    }

    // ── 数学公式（块级 → KaTeX 预渲染图片，失败回退 LaTeX 源码） ──
    case 'blockMath': {
      const latex = attrs.latex || ''
      if (!latex) break
      const mathImg = ctx.blockMathCache.get(latex)
      if (mathImg) {
        // 渲染为居中图片
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
        // 回退：直接显示 LaTeX 源码（KaTeX textContent 提取会丢失上标/下标格式，不如源码可读）
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

    // inlineMath 在段落中已被 extractTextRuns 处理（替换为 Unicode 文本），不单独处理
    case 'inlineMath':
      break

    // ── 视频/音频/文件/iframe → 占位文本 ──
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

    // ── ECharts 图表 → 预渲染图片（回退占位文本） ──
    case 'echarts': {
      const img = ctx.echartsCache.get(node)
      if (addCachedImage(ctx, img, pres)) break
      // 回退：占位文本
      addPlaceholderLabel(ctx, '[Chart]', pres)
      break
    }

    // ── 日期时间 → 渲染文本 ──
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

    // ── @提及 → 渲染 @label ──
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

    // ── 标签 → 带颜色渲染文本 ──
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

    // ── 折叠面板 → 渲染摘要 + 内容 ──
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

    // ── 文本框 → 带边框文本 ──
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

    // ── 列容器 → 顺序渲染子节点 ──
    case 'columnContainer':
    case 'column': {
      for (const c of content) {
        addNodeToSlide(ctx, c, pres, indentLevel)
      }
      break
    }

    // ── 脚注 → 渲染为小字文本 ──
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

    // ── Vue 自定义节点（question / quiz / homework / race / tabs / mindmap / html 等） ──
    case 'vue': {
      const vueType = attrs.type
      switch (vueType) {
        case 'question': {
          const c = attrs.content
          let questionData: any = null
          if (c != null && typeof c === 'object' && !Array.isArray(c)) {
            // 内联题目对象（AI 生成的未保存题目）
            questionData = c
          } else {
            // cid 字符串/数字 → 从预取缓存获取
            const cid = Number(c) || 0
            if (cid > 0) {
              questionData = ctx.questionCache.get(cid)
            }
          }
          if (questionData) {
            addQuestionToSlide(ctx, questionData, pres)
          } else {
            // 题目数据未获取到（cid 无效或 API 失败）→ 占位
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
          // sheet/aichat/aigenerator/chatroom/comment/condition/counter/timer/vfiles/office/pdf → 占位
          addPlaceholderLabel(ctx, `[${vueType || 'vue'}]`, pres)
          break
      }
      break
    }

    // ── 交互式组件 → 跳过 ──
    case 'toc':
    case 'inputs':
    case 'select':
    case 'optionBox':
      break

    // ── 其他类型 → 尝试渲染子节点 ──
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
