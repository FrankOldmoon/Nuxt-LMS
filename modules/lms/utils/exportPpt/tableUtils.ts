/**
 * Table building utilities
 */

import { extractPlainText } from './textUtils'
import { cssColorToHex } from './colorUtils'

/** Build pptxgenjs table row data */
export function buildTableRows(tableNode: any): { rows: any[][]; colCount: number } {
  const rows: any[][] = []
  let maxCols = 0

  for (const row of tableNode.content || []) {
    if (row.type !== 'tableRow') continue
    const cells: any[] = []
    for (const cell of row.content || []) {
      const isHeader = cell.type === 'tableHeader'
      const attrs = cell.attrs || {}
      const text = extractPlainText(cell)
      const cellOpts: any = {
        bold: isHeader,
        align: attrs.align || (isHeader ? 'center' : 'left'),
        valign: 'middle',
        fontSize: 12,
        fontFace: 'Calibri',
      }
      if (isHeader) {
        // Header defaults to blue background with white text
        cellOpts.fill = { color: cssColorToHex(attrs.background) || '4472C4' }
        cellOpts.color = cssColorToHex(attrs.color) || 'FFFFFF'
      } else {
        if (attrs.background) {
          const hex = cssColorToHex(attrs.background)
          if (hex) cellOpts.fill = { color: hex }
        }
        if (attrs.color) {
          const hex = cssColorToHex(attrs.color)
          if (hex) cellOpts.color = hex
        }
      }
      cells.push({ text, options: cellOpts })
    }
    maxCols = Math.max(maxCols, cells.length)
    rows.push(cells)
  }

  return { rows, colCount: maxCols }
}
