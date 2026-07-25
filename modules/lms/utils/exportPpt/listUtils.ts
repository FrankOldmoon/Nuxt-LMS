/**
 * 列表展开与渲染工具
 */

import type { ListItem, SlideContext } from './types'
import { BODY_FONT_SIZE, BODY_LINE_HEIGHT } from './constants'
import { extractTextRuns, estimateTextHeight } from './textUtils'
import { newSlide } from './slideUtils'

/** 展开无序/有序列表为扁平的 ListItem 数组（支持嵌套）
 *  @param inlineMathCache 透传给 extractTextRuns，用于行内公式文本替换
 */
export function flattenListItems(
  listNode: any,
  indentLevel: number,
  listType: 'bullet' | 'ordered',
  inlineMathCache?: Map<string, string>,
): ListItem[] {
  const items: ListItem[] = []
  let numberIndex: number = listNode.attrs?.start || 1

  for (const child of listNode.content || []) {
    if (child.type !== 'listItem') continue

    // 提取 listItem 内段落文本（排除嵌套列表）
    const runs: any[] = []
    const nestedLists: any[] = []
    for (const c of child.content || []) {
      if (c.type === 'bulletList' || c.type === 'orderedList' || c.type === 'taskList') {
        nestedLists.push(c)
      } else if (c.type === 'paragraph') {
        runs.push(...extractTextRuns(c.content || [], inlineMathCache))
      } else {
        runs.push(...extractTextRuns(c.content || [c], inlineMathCache))
      }
    }

    // 生成前缀
    let bulletPrefix: string
    if (listType === 'ordered') {
      bulletPrefix = `${numberIndex}. `
    } else {
      const listTypeAttr = listNode.attrs?.listType || 'disc'
      bulletPrefix = listTypeAttr === 'circle' ? '○ ' : listTypeAttr === 'square' ? '■ ' : '• '
    }
    items.push({ runs, indentLevel, bulletPrefix })

    if (listType === 'ordered') numberIndex++

    // 递归处理嵌套列表
    for (const nested of nestedLists) {
      const nestedType = nested.type === 'orderedList' ? 'ordered' : 'bullet'
      items.push(...flattenListItems(nested, indentLevel + 1, nestedType, inlineMathCache))
    }
  }
  return items
}

/** 展开任务列表
 *  @param inlineMathCache 透传给 extractTextRuns
 */
export function flattenTaskItems(
  taskListNode: any,
  indentLevel: number,
  inlineMathCache?: Map<string, string>,
): ListItem[] {
  const items: ListItem[] = []
  for (const child of taskListNode.content || []) {
    if (child.type !== 'taskItem') continue
    const checked = child.attrs?.checked
    const prefix = checked ? '☑ ' : '☐ '
    const runs: any[] = []
    for (const c of child.content || []) {
      if (c.type === 'paragraph') {
        runs.push(...extractTextRuns(c.content || [], inlineMathCache))
      } else {
        runs.push(...extractTextRuns(c.content || [c], inlineMathCache))
      }
    }
    items.push({ runs, indentLevel, bulletPrefix: prefix })
  }
  return items
}

/** 渲染列表项到幻灯片 */
export function addListItems(ctx: SlideContext, items: ListItem[], pres: any): void {
  for (const item of items) {
    const text = item.runs.map(r => r.text).join('') || ' '
    const indent = item.indentLevel * 0.4
    const width = ctx.contentWidth - indent
    const height = estimateTextHeight(text, width, BODY_FONT_SIZE, BODY_LINE_HEIGHT)

    // 溢出 → 新空白页
    if (ctx.currentY + height + 0.05 > ctx.maxY) {
      newSlide(ctx, pres)
    }

    // 构建 runs，将 bullet/number 前缀合并到第一个 run
    const runs = [...item.runs]
    if (runs.length > 0) {
      runs[0] = {
        text: item.bulletPrefix + runs[0].text,
        options: { ...runs[0].options },
      }
    } else {
      runs.push({
        text: item.bulletPrefix,
        options: { fontSize: BODY_FONT_SIZE, fontFace: 'Calibri' },
      })
    }

    ctx.slide.addText(runs, {
      x: ctx.marginX + indent,
      y: ctx.currentY,
      w: width,
      h: height + 0.1,
      fontSize: BODY_FONT_SIZE,
      fontFace: 'Calibri',
      lineSpacingMultiple: BODY_LINE_HEIGHT,
      valign: 'top',
    })
    ctx.currentY += height + 0.08
  }
}
