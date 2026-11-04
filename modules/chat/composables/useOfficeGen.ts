/**
 * 浏览器端生成 Office 文件
 *
 * 为什么不放服务端：教师批量导出成绩单时，服务端 CPU 会被生成任务占满。
 * 生成放用户自己的机器上，服务端只接收 base64 落库，成本几乎为零。
 *
 * 两个库都用动态 import —— exceljs / docx 加起来超过 1MB，
 * 不该进首屏包，第一次用到再加载。
 */

const BORDER_COLOR = 'FFD0D7E2'

export interface XlsxSheet {
  name?: string
  headers?: string[]
  rows: (string | number | null)[][]
  widths?: number[]
}

export interface DocxBlock {
  type: 'heading' | 'paragraph' | 'bullet' | 'table'
  text?: string
  level?: number
  items?: string[]
  headers?: string[]
  rows?: (string | number)[][]
}

/** ArrayBuffer / Uint8Array 转 base64（分块，避免大文件爆栈） */
export function bytesToBase64(input: ArrayBuffer | Uint8Array): string {
  const bytes = input instanceof Uint8Array ? input : new Uint8Array(input)
  let bin = ''
  const CHUNK = 0x8000
  for (let i = 0; i < bytes.length; i += CHUNK) {
    bin += String.fromCharCode(...bytes.subarray(i, i + CHUNK))
  }
  return btoa(bin)
}

export async function buildXlsx(sheets: XlsxSheet[]): Promise<Uint8Array> {
  const mod: any = await import('exceljs')
  const ExcelJS = mod.default || mod
  const list = Array.isArray(sheets) && sheets.length ? sheets : [{ rows: [] }]
  const wb = new ExcelJS.Workbook()
  wb.creator = 'AI LMS'
  wb.created = new Date()

  const border = {
    top: { style: 'thin', color: { argb: BORDER_COLOR } },
    left: { style: 'thin', color: { argb: BORDER_COLOR } },
    bottom: { style: 'thin', color: { argb: BORDER_COLOR } },
    right: { style: 'thin', color: { argb: BORDER_COLOR } },
  }

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
    for (const r of rows) ws.addRow(Array.isArray(r) ? r : [r])

    const colCount = Math.max(headers.length, ...rows.map((r) => (Array.isArray(r) ? r.length : 1)), 1)
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

    for (let r = 1; r <= ws.rowCount; r++) {
      for (let c = 1; c <= colCount; c++) ws.getCell(r, c).border = border
    }
  }

  const buf = await wb.xlsx.writeBuffer()
  return new Uint8Array(buf as ArrayBuffer)
}

export async function buildDocx(title: string, blocks: DocxBlock[]): Promise<Uint8Array> {
  const d: any = await import('docx')
  const { Document, Packer, Paragraph, HeadingLevel, Table, TableRow, TableCell, WidthType } = d

  const headingMap = [
    HeadingLevel.HEADING_1,
    HeadingLevel.HEADING_2,
    HeadingLevel.HEADING_3,
    HeadingLevel.HEADING_4,
  ]

  const children: any[] = []
  if (title) children.push(new Paragraph({ text: title, heading: HeadingLevel.TITLE }))

  for (const b of blocks || []) {
    if (!b || typeof b !== 'object') continue

    if (b.type === 'heading') {
      const idx = Math.min(3, Math.max(0, (b.level || 1) - 1))
      children.push(new Paragraph({ text: String(b.text || ''), heading: headingMap[idx] }))
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
      const trs: any[] = []
      if (headers.length) {
        trs.push(new TableRow({
          children: headers.map((h) => new TableCell({ children: [new Paragraph({ text: String(h) })] })),
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
        children.push(new Paragraph({ text: '' }))
      }
      continue
    }
    children.push(new Paragraph({ text: String(b.text || '') }))
  }

  if (!children.length) children.push(new Paragraph({ text: '' }))

  const doc = new Document({ sections: [{ children }] })
  // toBlob 在浏览器可用（toBuffer 依赖 Node 的 Buffer）
  const blob: Blob = await Packer.toBlob(doc)
  return new Uint8Array(await blob.arrayBuffer())
}

// ===================== PowerPoint =====================
export interface PptxSlide {
  title?: string
  bullets?: string[]
  /** 演讲者备注 */
  notes?: string
  table?: { headers?: string[]; rows: (string | number)[][] }
}

const FONT_FACE = 'Microsoft YaHei'
const INK = '1E293B'
const MUTED = '64748B'
const ACCENT = '2563EB'

export async function buildPptx(
  title: string,
  subtitle: string,
  slides: PptxSlide[],
): Promise<Uint8Array> {
  const mod: any = await import('pptxgenjs')
  const PptxGenJS = mod.default || mod
  const pptx = new PptxGenJS()
  pptx.layout = 'LAYOUT_16x9'

  // 封面：标题 + 副标题 + 一条强调色短线
  if (title) {
    const s = pptx.addSlide()
    s.background = { color: 'F8FAFC' }
    s.addText(title, {
      x: 0.8, y: 2.1, w: 8.4, h: 1.4,
      fontSize: 34, bold: true, color: INK, align: 'left', fontFace: FONT_FACE,
    })
    s.addShape(pptx.ShapeType.rect, { x: 0.85, y: 1.92, w: 0.9, h: 0.07, fill: { color: ACCENT } })
    if (subtitle) {
      s.addText(subtitle, {
        x: 0.8, y: 3.5, w: 8.4, h: 0.8,
        fontSize: 16, color: MUTED, fontFace: FONT_FACE,
      })
    }
  }

  for (const sl of slides || []) {
    const s = pptx.addSlide()
    s.background = { color: 'FFFFFF' }

    s.addText(sl.title || '', {
      x: 0.7, y: 0.35, w: 8.6, h: 0.7,
      fontSize: 24, bold: true, color: INK, fontFace: FONT_FACE,
    })
    s.addShape(pptx.ShapeType.rect, { x: 0.72, y: 1.06, w: 1.2, h: 0.05, fill: { color: ACCENT } })

    if (sl.bullets?.length) {
      s.addText(
        sl.bullets.map((t) => ({ text: String(t), options: { bullet: true, breakLine: true } })),
        {
          x: 0.95, y: 1.45, w: 8.1, h: 4.2,
          fontSize: 18, color: '334155', fontFace: FONT_FACE,
          lineSpacingMultiple: 1.4, valign: 'top',
        },
      )
    }

    if (sl.table?.rows?.length) {
      const rows: any[] = []
      if (sl.table.headers?.length) {
        rows.push(sl.table.headers.map((h) => ({
          text: String(h),
          options: { bold: true, fill: { color: 'EAF2FF' } },
        })))
      }
      for (const r of sl.table.rows) {
        rows.push((Array.isArray(r) ? r : [r]).map((c) => ({ text: String(c ?? '') })))
      }
      s.addTable(rows, {
        x: 0.95, y: sl.bullets?.length ? 4.0 : 1.6, w: 8.1,
        border: { type: 'solid', color: 'D0D7E2', pt: 1 },
        fontSize: 14, fontFace: FONT_FACE, valign: 'middle',
      })
    }

    if (sl.notes) s.addNotes(String(sl.notes))
  }

  // 一页都没有时就给张空白页，避免生成非法文件
  if (!pptx._slides?.length) pptx.addSlide()

  const blob: Blob = await pptx.write({ outputType: 'blob' })
  return new Uint8Array(await blob.arrayBuffer())
}
