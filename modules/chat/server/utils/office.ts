/**
 * Office 文件生成（服务端 Node，纯 JS 库，不依赖 Python / 浏览器）
 *
 * 为什么放服务端：
 * - 浏览器端 Pyodide 也能装 openpyxl，但要靠 base64 把二进制回传，链路长
 * - 调本地 Python 需要部署机装解释器和库，换台机器就崩
 * - exceljs / docx 都是纯 JS，跟项目同栈，零额外部署成本
 */
import ExcelJS from 'exceljs'
import {
  Document,
  Packer,
  Paragraph,
  HeadingLevel,
  Table,
  TableRow,
  TableCell,
  WidthType,
} from 'docx'

// ===================== Excel =====================
export interface XlsxSheet {
  name?: string
  headers?: string[]
  rows: (string | number | null)[][]
  /** 每列宽度（字符数），不给就按内容长度估算 */
  widths?: number[]
}

const BORDER = {
  top: { style: 'thin' as const, color: { argb: 'FFD0D7E2' } },
  left: { style: 'thin' as const, color: { argb: 'FFD0D7E2' } },
  bottom: { style: 'thin' as const, color: { argb: 'FFD0D7E2' } },
  right: { style: 'thin' as const, color: { argb: 'FFD0D7E2' } },
}

export async function makeXlsx(sheets: XlsxSheet[]): Promise<Uint8Array> {
  const list = Array.isArray(sheets) && sheets.length ? sheets : [{ rows: [] }]
  const wb = new ExcelJS.Workbook()
  wb.creator = 'AI LMS'
  wb.created = new Date()

  for (const [i, sheet] of list.entries()) {
    const ws = wb.addWorksheet(sheet.name || `Sheet${i + 1}`)
    const headers = Array.isArray(sheet.headers) ? sheet.headers : []
    const rows = Array.isArray(sheet.rows) ? sheet.rows : []

    if (headers.length) {
      ws.addRow(headers)
      const head = ws.getRow(1)
      head.font = { bold: true }
      head.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFEAF2FF' } }
      head.alignment = { vertical: 'middle', horizontal: 'center' }
      head.height = 22
    }

    for (const r of rows) {
      ws.addRow(Array.isArray(r) ? r : [r])
    }

    // 列宽：给定的优先，否则按最长内容估算（上限 50，避免一列撑满屏）
    const colCount = Math.max(
      headers.length,
      ...rows.map((r) => (Array.isArray(r) ? r.length : 1)),
      1,
    )
    for (let c = 1; c <= colCount; c++) {
      const given = sheet.widths?.[c - 1]
      if (given) {
        ws.getColumn(c).width = given
        continue
      }
      let max = 6
      const scan: any[] = headers.length ? [headers, ...rows] : rows
      for (const row of scan) {
        const v = Array.isArray(row) ? row[c - 1] : undefined
        const len = String(v ?? '').length
        if (len > max) max = len
      }
      ws.getColumn(c).width = Math.min(50, max + 4)
    }

    // 全表细边框（空表跳过）
    for (let r = 1; r <= ws.rowCount; r++) {
      for (let c = 1; c <= colCount; c++) {
        ws.getCell(r, c).border = BORDER
      }
    }
  }

  const buf = await wb.xlsx.writeBuffer()
  return new Uint8Array(buf as ArrayBuffer)
}

// ===================== Word =====================
export interface DocxBlock {
  type: 'heading' | 'paragraph' | 'bullet' | 'table'
  text?: string
  level?: number
  items?: string[]
  headers?: string[]
  rows?: (string | number)[][]
}

const HEADING_MAP = [
  HeadingLevel.HEADING_1,
  HeadingLevel.HEADING_2,
  HeadingLevel.HEADING_3,
  HeadingLevel.HEADING_4,
]

export async function makeDocx(title: string, blocks: DocxBlock[]): Promise<Uint8Array> {
  const children: any[] = []
  if (title) {
    children.push(new Paragraph({ text: title, heading: HeadingLevel.TITLE }))
  }

  for (const b of blocks || []) {
    if (!b || typeof b !== 'object') continue

    if (b.type === 'heading') {
      const idx = Math.min(3, Math.max(0, (b.level || 1) - 1))
      children.push(new Paragraph({ text: String(b.text || ''), heading: HEADING_MAP[idx] }))
      continue
    }

    if (b.type === 'bullet') {
      for (const item of b.items || []) {
        children.push(new Paragraph({ text: String(item), bullet: { level: 0 } }))
      }
      continue
    }

    if (b.type === 'table') {
      const headers = Array.isArray(b.headers) ? b.headers : []
      const rows = Array.isArray(b.rows) ? b.rows : []
      const trs: TableRow[] = []
      if (headers.length) {
        trs.push(new TableRow({
          children: headers.map((h) => new TableCell({
            children: [new Paragraph({ text: String(h), heading: undefined })],
          })),
        }))
      }
      for (const r of rows) {
        trs.push(new TableRow({
          children: (Array.isArray(r) ? r : [r]).map((c) => new TableCell({
            children: [new Paragraph({ text: String(c ?? '') })],
          })),
        }))
      }
      if (trs.length) {
        children.push(new Table({ rows: trs, width: { size: 100, type: WidthType.PERCENTAGE } }))
        // 表格后空一行，避免下一段贴着表格
        children.push(new Paragraph({ text: '' }))
      }
      continue
    }

    children.push(new Paragraph({ text: String(b.text || '') }))
  }

  if (!children.length) children.push(new Paragraph({ text: '' }))

  const doc = new Document({ sections: [{ children }] })
  return new Uint8Array(await Packer.toBuffer(doc))
}
