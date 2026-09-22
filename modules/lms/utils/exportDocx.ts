/**
 * 章节 Tiptap JSON → Word (.docx) 导出（纯前端，基于 docx 库）
 *
 * 覆盖：
 * - 标准节点：标题、段落与文本样式、有序/无序/任务列表、代码块、引用、表格、
 *   分割线、图片（内嵌真实图片，失败退化为文字占位）、公式
 * - 富文本容器：callout / details / columns（递归渲染内容）
 * - 自定义扩展（vue 节点）渲染为用户可见内容：
 *   question（内联 JSON 或题库 cid，cid 通过 /api/questions/show 查询渲染）、
 *   tabs / stepper / vfiles（标签/步骤/文件 + 子内容）、sheet（表格）、
 *   mindmap / pintora（DSL 文本）、echarts（摘要）、html（预览提示）等
 */
import {
  Document, Packer, Paragraph, TextRun, HeadingLevel,
  Table, TableRow, TableCell, WidthType, AlignmentType,
  BorderStyle, LevelFormat, ShadingType, ImageRun,
} from 'docx'
import { markdownToTiptap } from './markdown'

interface TiptapMark { type: string; attrs?: Record<string, any> }
interface TiptapNode { type: string; attrs?: Record<string, any>; content?: TiptapNode[]; text?: string; marks?: TiptapMark[] }

/** 题目类型 → 中文题型名 */
const TYPE_LABEL: Record<string, string> = {
  single: '单选题', multiple: '多选题', judge: '判断题', fill: '填空题', select: '选择题',
  sort: '排序题', classify: '分类题', puzzle: '拼图题', html: 'HTML 题', 'short-answer': '简答题',
  match: '连线题', composite: '复合题', video: '视频题', evaluation: '评估题', oj: 'OJ 题',
}

// ─────────────────────────────────────
// 图片内嵌（预取 + 渲染）
// ─────────────────────────────────────

/** Word 正文内容区宽度：A4 + 默认 1 英寸页边距约 6.5in，按 96dpi ≈ 624px，留点余量 */
const MAX_IMAGE_WIDTH_PX = 600

/** docx 的 ImageRun 只认这几种（webp 不支持，须转 PNG） */
type DocxImageType = 'png' | 'jpg' | 'gif' | 'bmp'

interface ResolvedImage {
  type: DocxImageType
  data: Uint8Array
  /** 像素尺寸：docx 的 transformation 以像素为单位（内部按 9525 EMU/px 换算） */
  width: number
  height: number
}

/** src → 已就绪的图片；取不到时存 null，渲染阶段退化为文字占位 */
type ImageCache = Map<string, ResolvedImage | null>

/** 渲染上下文：异步预取的结果（题库题目 / 图片），同步渲染阶段只查表 */
interface RenderCtx {
  questionMap: Map<number, any>
  images: ImageCache
}

/** 递归收集 image / inlineImage 节点的 src */
function collectImageSrcs(nodes: TiptapNode[] | undefined, out: Set<string>) {
  if (!nodes) return
  for (const n of nodes) {
    if (n.type === 'image' || n.type === 'inlineImage') {
      const src = n.attrs?.src
      if (typeof src === 'string' && src) out.add(src)
    }
    collectImageSrcs(n.content, out)
  }
}

function mimeToDocxType(mime: string): DocxImageType | null {
  const t = String(mime || '').toLowerCase()
  if (t === 'image/png') return 'png'
  if (t === 'image/jpeg' || t === 'image/jpg') return 'jpg'
  if (t === 'image/gif') return 'gif'
  if (t === 'image/bmp' || t === 'image/x-ms-bmp') return 'bmp'
  return null
}

/** blob URL → <img>：比 createImageBitmap 兼容性更好，SVG 也能取到自然尺寸 */
function loadImageElement(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error('image decode failed'))
    img.src = url
  })
}

/** 浏览器能解码但 Word 不支持的格式（本站图片多为 webp）→ canvas 转 PNG */
async function rasterizeToPng(img: HTMLImageElement): Promise<Blob> {
  const canvas = document.createElement('canvas')
  canvas.width = img.naturalWidth
  canvas.height = img.naturalHeight
  const ctx2d = canvas.getContext('2d')
  if (!ctx2d) throw new Error('canvas 2d context unavailable')
  ctx2d.drawImage(img, 0, 0)
  return await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('canvas.toBlob failed'))), 'image/png')
  })
}

/** 单张图片的超时上限：避免个别图片挂住导致整篇导出一直转圈 */
const IMAGE_LOAD_TIMEOUT_MS = 15000

function withTimeout<T>(p: Promise<T>, ms: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('image load timeout')), ms)
    p.then(
      (v) => { clearTimeout(timer); resolve(v) },
      (e) => { clearTimeout(timer); reject(e) },
    )
  })
}

/** 取一张图片 → Word 可嵌入的数据（下载 → 量尺寸 → 必要时转 PNG） */
async function loadOneImage(src: string): Promise<ResolvedImage> {
  const res = await fetch(src)
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  const blob = await res.blob()

  const objectUrl = URL.createObjectURL(blob)
  try {
    const img = await loadImageElement(objectUrl)
    const naturalW = img.naturalWidth
    const naturalH = img.naturalHeight
    if (!naturalW || !naturalH) throw new Error('image has no intrinsic size')

    let type = mimeToDocxType(blob.type)
    let data: Uint8Array
    if (type) {
      data = new Uint8Array(await blob.arrayBuffer())
    } else {
      // webp / svg 等 Word 不认的格式：栅格化为 PNG
      const png = await rasterizeToPng(img)
      data = new Uint8Array(await png.arrayBuffer())
      type = 'png'
    }

    const scale = naturalW > MAX_IMAGE_WIDTH_PX ? MAX_IMAGE_WIDTH_PX / naturalW : 1
    return {
      type,
      data,
      width: Math.max(1, Math.round(naturalW * scale)),
      height: Math.max(1, Math.round(naturalH * scale)),
    }
  } finally {
    URL.revokeObjectURL(objectUrl)
  }
}

/**
 * 预取章节里的全部图片，转成 Word 可嵌入的数据。
 * 与题库 cid 预取同一思路：异步工作先做完，渲染阶段（同步）只查表。
 * 单张失败只把它置为 null（走文字占位），不影响整篇导出。
 */
async function preloadImages(root: any): Promise<ImageCache> {
  const cache: ImageCache = new Map()
  // 只有浏览器能解码图片时才预取；SSR/Node 下直接返回空表 → 退化为文字占位（不报错）
  if (typeof Image === 'undefined' || typeof document === 'undefined') return cache

  const srcs = new Set<string>()
  collectImageSrcs(root?.content, srcs)

  await Promise.all([...srcs].map(async (src) => {
    try {
      cache.set(src, await withTimeout(loadOneImage(src), IMAGE_LOAD_TIMEOUT_MS))
    } catch {
      cache.set(src, null)
    }
  }))

  return cache
}

/** 已解析图片 → ImageRun */
function imageRun(info: ResolvedImage, alt: string): ImageRun {
  return new ImageRun({
    type: info.type,
    data: info.data,
    transformation: { width: info.width, height: info.height },
    ...(alt ? { altText: { name: alt, description: alt } } : {}),
  })
}

/** 图片节点 → 段落：内嵌真实图片，失败退化为文字占位；alt 作为图注 */
function imageToParagraphs(attrs: any, images: ImageCache): Paragraph[] {
  const src = typeof attrs?.src === 'string' ? attrs.src : ''
  const info = src ? images.get(src) : null
  if (!info) {
    return [textParagraph(`[图片: ${attrs?.alt || src || ''}]`, { color: '666666', italic: true })]
  }
  const alt = typeof attrs?.alt === 'string' ? attrs.alt.trim() : ''
  return [
    new Paragraph({ alignment: AlignmentType.CENTER, children: [imageRun(info, alt)] }),
    ...(alt ? [textParagraph(alt, { italic: true, color: '888888' })] : []),
  ]
}

// ─────────────────────────────────────
// 基础渲染
// ─────────────────────────────────────

/** 行内节点 → TextRun[] */
function inlineToRuns(nodes: TiptapNode[] = [], ctx: RenderCtx): TextRun[] {
  const runs: TextRun[] = []
  for (const n of nodes) {
    if (n.type === 'text') {
      const marks = n.marks || []
      const bold = marks.some((m) => m.type === 'bold')
      const italics = marks.some((m) => m.type === 'italic')
      const strike = marks.some((m) => m.type === 'strike')
      const isCode = marks.some((m) => m.type === 'code')
      const link = marks.find((m) => m.type === 'link')
      runs.push(new TextRun({
        text: n.text ?? '',
        bold,
        italics,
        strike,
        font: isCode ? 'Consolas' : undefined,
        color: link ? '0563C1' : undefined,
      }))
      if (link?.attrs?.href) {
        runs.push(new TextRun({ text: ' (' + link.attrs.href + ')', color: '999999', size: 18 }))
      }
    } else if (n.type === 'hardBreak') {
      runs.push(new TextRun({ break: 1 }))
    } else if (n.type === 'inlineMath') {
      runs.push(new TextRun({ text: `$${n.attrs?.latex || ''}$`, font: 'Cambria Math' }))
    } else if (n.type === 'image' || n.type === 'inlineImage') {
      const info = n.attrs?.src ? ctx.images.get(String(n.attrs.src)) : null
      if (info) runs.push(imageRun(info, String(n.attrs?.alt || '').trim()))
      else runs.push(new TextRun({ text: `[图片: ${n.attrs?.alt || n.attrs?.src || ''}]`, color: '666666', italics: true }))
    } else if (n.content?.length) {
      runs.push(...inlineToRuns(n.content, ctx))
    } else if (n.text) {
      runs.push(new TextRun({ text: n.text }))
    }
  }
  return runs
}

/** markdown 字符串 → 段落（题目题面/选项等多为 markdown） */
function mdParagraphs(md: string, ctx: RenderCtx): Paragraph[] {
  const text = String(md ?? '').trim()
  if (!text) return []
  const tiptap = markdownToTiptap(text)
  return (tiptap.content || []).flatMap((c) => blockToParagraphs(c, ctx))
}

/** 单个文本段落 */
function textParagraph(text: string, opts: { bold?: boolean; italic?: boolean; indent?: number; color?: string } = {}): Paragraph {
  return new Paragraph({
    children: [new TextRun({ text, bold: opts.bold, italics: opts.italic, color: opts.color })],
    ...(opts.indent ? { indent: { left: opts.indent } } : {}),
  })
}

/** 代码样式段落 */
function codeParagraph(text: string): Paragraph[] {
  return text.split('\n').map((line) => new Paragraph({
    shading: { type: ShadingType.CLEAR, fill: 'F2F2F2' },
    children: [new TextRun({ text: line, font: 'Consolas', size: 18 })],
  }))
}

/** 任意 tiptap doc/content → 段落（vue 子内容递归用） */
function docToParagraphs(content: any, ctx: RenderCtx): Paragraph[] {
  if (!content) return []
  const nodes = Array.isArray(content) ? content : (content.content || [])
  return nodes.flatMap((c: any) => blockToParagraphs(c, ctx))
}

// ─────────────────────────────────────
// question 渲染（含题库 cid 查询）
// ─────────────────────────────────────

/** 递归收集 vue question 节点的 cid（数字形式 content） */
function collectQuestionCids(nodes: TiptapNode[] | undefined, out: Set<number>) {
  if (!nodes) return
  for (const n of nodes) {
    if (n.type === 'vue' && n.attrs?.type === 'question') {
      const c = n.attrs.content
      const num = (typeof c === 'number') ? c : (typeof c === 'string' && /^\d+$/.test(c) ? Number(c) : NaN)
      if (!isNaN(num) && num > 0) out.add(num)
    }
    collectQuestionCids(n.content, out)
  }
}

/** 格式化题目答案（对齐前端 useQuestionRender.formattedAnswers 逻辑） */
function formatAnswers(q: any): string {
  const type = q.type
  const answer = Array.isArray(q.answer) ? q.answer : []
  if (!answer.length) return ''
  const options: any[] = Array.isArray(q.options) ? q.options : []
  if (type === 'single' || type === 'multiple') {
    return answer.map((idx: number) => String.fromCharCode(65 + idx)).join('、')
  }
  if (type === 'judge') return answer.map((idx: number) => (idx === 0 ? '正确' : '错误')).join('、')
  if (type === 'sort') return answer.map((idx: number) => options[idx] || `#${idx}`).join(' → ')
  if (type === 'classify') {
    return options.map((cat: any, ci: number) => `${cat?.name || `#${ci + 1}`}: ${(cat?.items || []).join('、')}`).join('；')
  }
  if (type === 'puzzle') return '原图'
  if (type === 'html') return '由 iframe 交互判定'
  if (type === 'short-answer') return answer[0] || ''
  if (type === 'match') return options.map((p: any) => `${p?.left} ↔ ${p?.right}`).join('；')
  if (type === 'evaluation') return `达标阈值 ${Math.round((options?.threshold || 0.8) * 100)}%`
  if (type === 'oj') return options?.pid ? `题目 ID: ${options.pid}` : '由 OJ 判定'
  return answer.map((a: any) => String(a)).join('、')
}

/** 题目 → 段落（content 可为内联 JSON 或题库 cid） */
function questionToParagraphs(content: any, ctx: RenderCtx): Paragraph[] {
  let q = content
  const cid = (typeof content === 'number') ? content : (typeof content === 'string' && /^\d+$/.test(content) ? Number(content) : NaN)
  if (!isNaN(cid)) q = ctx.questionMap.get(cid)
  if (!q || typeof q !== 'object' || Array.isArray(q)) {
    return [textParagraph(`【题目】#${content}`, { bold: true })]
  }

  const typeLabel = TYPE_LABEL[q.type] || q.type || '题目'
  const title = q.name || '题目'
  const paras: Paragraph[] = [textParagraph(`【${typeLabel}】${title}`, { bold: true })]

  // 题面（markdown 或复合题数组）
  if (typeof q.content === 'string' && q.content.trim()) {
    paras.push(...mdParagraphs(q.content, ctx))
  } else if (Array.isArray(q.content)) {
    // composite 复合题：子题
    (q.content as any[]).forEach((sub, i) => {
      const subText = typeof sub?.content === 'string' ? sub.content : ''
      const subTitle = sub?.name || `子题 ${i + 1}`
      paras.push(textParagraph(`[${i + 1}] ${subTitle}`, { bold: true, indent: 360 }))
      if (subText) paras.push(...mdParagraphs(subText, ctx).map((p) => withIndent(p, 360)))
    })
  }

  // 选项
  const options: any[] = Array.isArray(q.options) ? q.options : []
  options.forEach((opt, idx) => {
    if (opt == null || opt === '') return
    if (q.type === 'match' && typeof opt === 'object') {
      paras.push(textParagraph(`${String.fromCharCode(65 + idx)}. ${opt?.left} ↔ ${opt?.right}`, { indent: 360 }))
    } else if (q.type === 'classify' && typeof opt === 'object') {
      paras.push(textParagraph(`${opt?.name}: ${(opt?.items || []).join('、')}`, { indent: 360 }))
    } else {
      const label = (q.type === 'judge') ? (idx === 0 ? 'A. 正确' : 'B. 错误') : `${String.fromCharCode(65 + idx)}. `
      const text = typeof opt === 'string' ? opt : JSON.stringify(opt)
      paras.push(...mdParagraphs(`${label}${text}`, ctx).map((p) => withIndent(p, 360)))
    }
  })

  // 答案与解析
  const ans = formatAnswers(q)
  if (ans) paras.push(textParagraph(`答案：${ans}`, { bold: true }))
  if (typeof q.explanation === 'string' && q.explanation.trim()) {
    paras.push(...mdParagraphs(`解析：${q.explanation}`, ctx))
  }
  return paras
}

function withIndent(p: Paragraph, left: number): Paragraph {
  return new Paragraph({ children: p.children, indent: { left } })
}

// ─────────────────────────────────────
// vue 自定义扩展渲染
// ─────────────────────────────────────

function vueNodeToParagraphs(node: TiptapNode, ctx: RenderCtx): Paragraph[] {
  const type = node.attrs?.type as string
  const content = node.attrs?.content as any
  const header = (text: string) => textParagraph(text, { bold: true })

  switch (type) {
    case 'question': return questionToParagraphs(content, ctx)
    case 'html': return [textParagraph('[HTML 内容] 请在浏览器中打开章节预览查看。', { italic: true, color: '888888' })]
    case 'mindmap': return [header('思维导图：'), ...codeParagraph(typeof content === 'string' ? content : JSON.stringify(content, null, 2))]
    case 'pintora': return [header('Pintora 图表：'), ...codeParagraph(typeof content === 'string' ? content : JSON.stringify(content, null, 2))]
    case 'tabs': {
      const tabs = content?.tabs || []
      const paras: Paragraph[] = []
      tabs.forEach((tab: any, i: number) => {
        paras.push(header(`Tab ${i + 1}: ${tab?.label || ''}`))
        paras.push(...docToParagraphs(tab?.content, ctx))
      })
      return paras
    }
    case 'stepper': {
      const steps = content?.steps || []
      const paras: Paragraph[] = []
      steps.forEach((s: any, i: number) => {
        paras.push(header(`步骤 ${i + 1}: ${s?.title || ''}`))
        paras.push(...docToParagraphs(s?.description, ctx))
      })
      return paras
    }
    case 'vfiles': {
      const items = content?.items || []
      const paras: Paragraph[] = []
      items.forEach((it: any) => {
        paras.push(header(`文件：${it?.label || ''}`))
        paras.push(...docToParagraphs(it?.content, ctx))
      })
      return paras
    }
    case 'sheet': {
      const cellData = content?.cellData || {}
      const rows = Object.keys(cellData).sort((a, b) => Number(a) - Number(b))
        .map((r) => Object.keys(cellData[r]).sort((a, b) => Number(a) - Number(b))
          .map((c) => cellData[r][c]?.v ?? ''))
      return [sheetToDocxTable(rows)]
    }
    case 'echarts': {
      const opts = content?.chartOptions || content
      const title = opts?.title?.text || ''
      const series = Array.isArray(opts?.series) ? opts.series.map((s: any) => s.name || s.type).filter(Boolean).join('、') : ''
      return [header('图表：' + (title || series || 'ECharts'))]
    }
    case 'iframe': return [textParagraph(`[嵌入网页] ${node.attrs?.src || content}`, { color: '888888' })]
    default: {
      // quiz/homework/race 等其他扩展：递归渲染可读子内容，否则给出类型名
      if (content && typeof content === 'object' && !Array.isArray(content)) {
        const json = JSON.stringify(content)
        return [header(`[${type}]`), ...codeParagraph(json)]
      }
      return [header(`[${type}]`), ...(typeof content === 'string' && content.trim() ? mdParagraphs(content, ctx) : [])]
    }
  }
}

/** 二维数组 → docx Table */
function sheetToDocxTable(rows: string[][]): Table {
  const maxCols = Math.max(1, ...rows.map((r) => r.length))
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: rows.map((cells, ri) => new TableRow({
      children: Array.from({ length: maxCols }, (_, ci) => new TableCell({
        width: { size: 100 / maxCols, type: WidthType.PERCENTAGE },
        shading: ri === 0 ? { type: ShadingType.CLEAR, fill: 'E8E8E8' } : undefined,
        children: [new Paragraph({ children: [new TextRun({ text: cells[ci] ?? '', size: 18 })] })],
      })),
    })),
  })
}

/** 块级节点 → Paragraph[] */
function blockToParagraphs(node: TiptapNode, ctx: RenderCtx): Paragraph[] {
  switch (node.type) {
    case 'paragraph': {
      const runs = inlineToRuns(node.content || [], ctx)
      return runs.length ? [new Paragraph({ children: runs })] : []
    }
    case 'heading': {
      const level = Math.min(Number(node.attrs?.level) || 1, 6)
      const headingMap: Record<number, string> = {
        1: HeadingLevel.HEADING_1, 2: HeadingLevel.HEADING_2, 3: HeadingLevel.HEADING_3,
        4: HeadingLevel.HEADING_4, 5: HeadingLevel.HEADING_5, 6: HeadingLevel.HEADING_6,
      }
      return [new Paragraph({ heading: headingMap[level], children: inlineToRuns(node.content || [], ctx) })]
    }
    case 'bulletList':
    case 'taskList': {
      return (node.content || []).map((item) => {
        const para = item.content?.find((b) => b.type === 'paragraph')
        const text = para ? inlineToRuns(para.content || [], ctx) : []
        const prefix = item.type === 'taskItem'
          ? new TextRun({ text: (item.attrs?.checked ? '☑ ' : '☐ ') })
          : undefined
        return new Paragraph({ bullet: { level: 0 }, children: prefix ? [prefix, ...text] : text })
      })
    }
    case 'orderedList': {
      return (node.content || []).map((item) => {
        const para = item.content?.find((b) => b.type === 'paragraph')
        return new Paragraph({
          numbering: { reference: 'num-list', level: 0 },
          children: para ? inlineToRuns(para.content || [], ctx) : [],
        })
      })
    }
    case 'codeBlock': {
      const code = (node.content || []).map((n) => n.text ?? '').join('')
      return codeParagraph(code)
    }
    case 'blockquote': {
      return (node.content || []).flatMap((c) => blockToParagraphs(c, ctx)).map((p) =>
        new Paragraph({ children: p.children, indent: { left: 720 }, border: { left: { style: BorderStyle.SINGLE, size: 6, color: '999999' } } }),
      )
    }
    case 'table': return [tableToDocxTable(node, ctx)]
    case 'horizontalRule': {
      return [new Paragraph({ border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: '999999' } }, children: [] })]
    }
    case 'blockMath': return [new Paragraph({ children: [new TextRun({ text: `$$\n${node.attrs?.latex || ''}\n$$`, font: 'Cambria Math' })] })]
    case 'image':
    case 'inlineImage': return imageToParagraphs(node.attrs || {}, ctx.images)
    case 'vue': return vueNodeToParagraphs(node, ctx)
    case 'callout': {
      const icon = node.attrs?.icon ? `${node.attrs.icon} ` : ''
      const inner = (node.content || []).flatMap((c) => blockToParagraphs(c, ctx))
      const first = inner[0]
      return [
        ...(first ? [new Paragraph({ children: [new TextRun({ text: icon, bold: true }), ...(first.children || [])] })] : []),
        ...inner.slice(1),
      ]
    }
    default: {
      if (node.content?.length) return node.content.flatMap((c) => blockToParagraphs(c, ctx))
      if (node.text) return [new Paragraph({ children: [new TextRun({ text: node.text })] })]
      return []
    }
  }
}

/** 表格 → docx Table */
function tableToDocxTable(node: TiptapNode, ctx: RenderCtx): Table {
  const rows = (node.content || []).map((row) =>
    new TableRow({
      children: (row.content || []).map((cell) => {
        const isHeader = cell.type === 'tableHeader'
        const paragraphs = blockToParagraphs(cell.content?.[0] || { type: 'paragraph', content: [] }, ctx)
        return new TableCell({
          width: { size: 100, type: WidthType.PERCENTAGE },
          shading: isHeader ? { type: ShadingType.CLEAR, fill: 'E8E8E8' } : undefined,
          children: paragraphs.length ? paragraphs : [new Paragraph({ children: [] })],
        })
      }),
    }),
  )
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows,
  })
}

// ─────────────────────────────────────
// 入口
// ─────────────────────────────────────

export interface DocxExportOptions {
  /** 课程 id：question 题库 cid 题目查询用 */
  courseId?: number
}

/**
 * Tiptap JSON doc → Word 文档 Blob
 * @param doc tiptap doc（支持 { json } 包装）
 * @param title 文档标题
 * @param opts.courseId 课程 id（用于解析 question 题库 cid）
 */
export async function tiptapToDocxBlob(doc: any, title: string, opts: DocxExportOptions = {}): Promise<Blob> {
  const root = doc?.json ?? doc
  const paragraphs: Paragraph[] = []

  if (title) {
    paragraphs.push(new Paragraph({ heading: HeadingLevel.TITLE, children: [new TextRun({ text: title })] }))
    paragraphs.push(new Paragraph({ children: [] }))
  }

  // 收集 question 题库 cid 并批量查询
  const cids = new Set<number>()
  collectQuestionCids(root?.content, cids)
  const questionMap = new Map<number, any>()
  if (cids.size && opts.courseId && import.meta.client) {
    await Promise.all([...cids].map(async (cid) => {
      try {
        const res = await $fetch(`/api/questions/show?course_id=${opts.courseId}&cid=${cid}`)
        if (res) questionMap.set(cid, res as any)
      } catch { /* 查询失败则保留 cid 占位 */ }
    }))
  }

  // 预取全部图片（webp 转 PNG 后内嵌），失败的单张退化为文字占位
  const images = await preloadImages(root)
  const ctx: RenderCtx = { questionMap, images }

  if (root && typeof root === 'object' && Array.isArray(root.content)) {
    for (const node of root.content) {
      paragraphs.push(...blockToParagraphs(node, ctx))
    }
  }

  const document = new Document({
    numbering: {
      config: [{
        reference: 'num-list',
        levels: [0, 1, 2, 3, 4, 5, 6, 7, 8].map((i) => ({
          level: i,
          format: LevelFormat.DECIMAL,
          text: `%${i + 1}.`,
          alignment: AlignmentType.START,
          style: { paragraph: { indent: { left: 720 * (i + 1), hanging: 360 } } },
        })),
      }],
    },
    styles: { default: { document: { run: { font: 'Microsoft YaHei', size: 22 } } } },
    sections: [{
      properties: {},
      children: paragraphs,
    }],
  })

  return Packer.toBlob(document)
}
