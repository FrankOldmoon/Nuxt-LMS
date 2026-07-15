/**
 * List expansion and rendering utilities
 */

import type { ListItem, SlideContext } from './types'
import { BODY_FONT_SIZE, BODY_LINE_HEIGHT } from './constants'
import { extractTextRuns, estimateTextHeight } from './textUtils'
import { newSlide } from './slideUtils'

/** Flatten unordered/ordered list into a flat ListItem array (supports nesting)
 *  @param inlineMathCache Passed through to extractTextRuns for inline formula text replacement
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

    // Extract paragraph text within listItem (excluding nested lists)
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

    // Generate prefix
    let bulletPrefix: string
    if (listType === 'ordered') {
      bulletPrefix = `${numberIndex}. `
    } else {
      const listTypeAttr = listNode.attrs?.listType || 'disc'
      bulletPrefix = listTypeAttr === 'circle' ? '○ ' : listTypeAttr === 'square' ? '■ ' : '• '
    }
    items.push({ runs, indentLevel, bulletPrefix })

    if (listType === 'ordered') numberIndex++

    // Recursively process nested lists
    for (const nested of nestedLists) {
      const nestedType = nested.type === 'orderedList' ? 'ordered' : 'bullet'
      items.push(...flattenListItems(nested, indentLevel + 1, nestedType, inlineMathCache))
    }
  }
  return items
}

/** Flatten task list
 *  @param inlineMathCache Passed through to extractTextRuns
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

/** Render list items to slide */
export function addListItems(ctx: SlideContext, items: ListItem[], pres: any): void {
  for (const item of items) {
    const text = item.runs.map(r => r.text).join('') || ' '
    const indent = item.indentLevel * 0.4
    const width = ctx.contentWidth - indent
    const height = estimateTextHeight(text, width, BODY_FONT_SIZE, BODY_LINE_HEIGHT)

    // Overflow → new blank page
    if (ctx.currentY + height + 0.05 > ctx.maxY) {
      newSlide(ctx, pres)
    }

    // Build runs, merging the bullet/number prefix into the first run
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
