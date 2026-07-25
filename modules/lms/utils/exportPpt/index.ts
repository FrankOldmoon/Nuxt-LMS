/**
 * 使用 pptxgenjs (CDN) 将 Tiptap JSON 章节内容导出为 PPT
 * 参考 modules/lms/components/ueditor/render 的渲染格式，保持内容和样式一致
 *
 * 分页策略：
 *  - 每个 h1/h2 开启新页（标题作为页标题）
 *  - h3-h6 作为当前页内子标题
 *  - 内容过长自动溢出到新页
 *  - pageBreak 强制分页
 *
 * 预渲染：
 *  - vue question 节点 → 预取题目数据（API 并行请求）
 *  - blockMath 节点 → KaTeX + html2canvas 渲染为 PNG 图片
 *  - inlineMath 节点 → KaTeX 渲染为 Unicode 文本（替换段落中的 LaTeX 源码）
 */

import type { SlideContext, MathImage } from './types'
import { collectVueQuestionCids } from './questionUtils'
import { collectVueContentCids, fetchVueContent, extractQuizQuestionCids, extractRaceQuestionCids } from './vueDataFetch'
import { prerenderMathNodes } from './mathRender'
import { prerenderImageNodes } from './imageRender'
import { addNodeToSlide } from './nodes'
import { newSlide } from './slideUtils'

// ═══════════════════════════════════════
// CDN 动态加载 pptxgenjs
// ═══════════════════════════════════════

const PPTXGEN_CDN = 'https://cdn.jsdelivr.net/npm/pptxgenjs@3.12.0/dist/pptxgen.bundle.js'
let pptxGenPromise: Promise<any> | null = null

function loadPptxGenJS(): Promise<any> {
  if (typeof window !== 'undefined' && (window as any).PptxGenJS) {
    return Promise.resolve((window as any).PptxGenJS)
  }
  if (pptxGenPromise) return pptxGenPromise
  pptxGenPromise = new Promise((resolve, reject) => {
    const script = document.createElement('script')
    script.src = PPTXGEN_CDN
    script.type = 'text/javascript'
    script.onload = () => {
      const PptxGenJS = (window as any).PptxGenJS
      if (PptxGenJS) resolve(PptxGenJS)
      else reject(new Error('pptxgenjs loaded but PptxGenJS not found'))
    }
    script.onerror = () => reject(new Error('Failed to load pptxgenjs from CDN'))
    document.head.appendChild(script)
  })
  return pptxGenPromise
}

// ═══════════════════════════════════════
// 主导出函数
// ═══════════════════════════════════════

/**
 * 将 Tiptap JSON 章节内容导出为 PPT 并下载
 * @param content Tiptap JSON 文档（doc 节点或 { json: ... } 包裹）
 * @param title 章节标题（用作第一页标题和文件名）
 * @param courseId 课程 ID（用于预取 vue question 节点的题目数据）
 */
export async function exportChapterToPpt(content: any, title: string, courseId?: number): Promise<void> {
  if (typeof window === 'undefined') {
    throw new Error('PPT export can only be used in the browser')
  }

  // 解析 Tiptap JSON（兼容 { json: ... } 包裹和裸 doc 两种形式）
  const json = content?.json ?? content
  const doc = json?.type === 'doc'
    ? json
    : { type: 'doc', content: Array.isArray(json) ? json : (json?.content || []) }
  const nodes = doc.content || []

  // ═══════════════════════════════════════
  // 预取阶段：quiz/homework/race → 嵌套题目 → 所有题目
  // ═══════════════════════════════════════

  // 1. 收集 vue question 节点的 cid（含嵌套在 quiz/race 中的）
  const questionCache = new Map<number, any>()
  const questionCids: number[] = []
  collectVueQuestionCids(nodes, questionCids)

  // 2. 收集 vue quiz/homework/race 节点的 cid，并行预取
  const quizCids: number[] = []
  const homeworkCids: number[] = []
  const raceCids: number[] = []
  collectVueContentCids(nodes, quizCids, homeworkCids, raceCids)

  const quizCache = new Map<number, any>()
  const homeworkCache = new Map<number, any>()
  const raceCache = new Map<number, any>()
  await fetchVueContent(courseId || 0, quizCids, homeworkCids, raceCids, quizCache, homeworkCache, raceCache)

  // 3. 从已预取的 quiz/race 中提取嵌套题目 cid，合并到 questionCids
  for (const quiz of quizCache.values()) {
    const qIds = extractQuizQuestionCids(quiz)
    for (const qid of qIds) {
      if (!questionCids.includes(qid)) questionCids.push(qid)
    }
  }
  for (const race of raceCache.values()) {
    const qIds = extractRaceQuestionCids(race)
    for (const qid of qIds) {
      if (!questionCids.includes(qid)) questionCids.push(qid)
    }
  }

  // 4. 并行预取所有题目（含嵌套题目）
  if (questionCids.length > 0 && courseId) {
    await Promise.all(questionCids.map(async (cid) => {
      try {
        const resp = await $fetch<{ data: any; success: boolean; msg: string }>(
          `/api/questions/show?course_id=${courseId}&cid=${cid}`,
        )
        if (resp?.success && resp.data) {
          questionCache.set(cid, resp.data)
        }
      } catch {
        // 静默忽略（题目可能已删除或无权限）
      }
    }))
  }

  // ═══════════════════════════════════════
  // 预渲染阶段：数学公式 + echarts/mindmap/html 图片
  // ═══════════════════════════════════════

  // 预渲染数学公式（blockMath → PNG 图片，inlineMath → Unicode 文本）
  // 传入缓存以扫描嵌套内容（题目 content/options、测验/作业 content）中的数学公式
  const blockMathCache = new Map<string, MathImage | null>()
  const inlineMathCache = new Map<string, string>()
  await prerenderMathNodes(nodes, blockMathCache, inlineMathCache, questionCache, quizCache, homeworkCache)

  // 预渲染 echarts/mindmap/html（并行 → PNG 图片缓存）
  const echartsCache = new Map<any, MathImage | null>()
  const mindmapCache = new Map<string, MathImage | null>()
  const htmlCache = new Map<string, MathImage | null>()
  await prerenderImageNodes(nodes, echartsCache, mindmapCache, htmlCache)

  // 加载 pptxgenjs
  const PptxGenJS = await loadPptxGenJS()
  const pres = new PptxGenJS()
  pres.layout = 'LAYOUT_WIDE'  // 13.33 × 7.5 inches
  pres.author = 'LMS'
  pres.company = 'LMS'

  // 页码
  pres.slideNumber = {
    x: 12.6,
    y: 7.15,
    w: 0.5,
    h: 0.3,
    fontSize: 10,
    color: '999999',
    align: 'right',
  }

  // 幻灯片上下文
  const ctx: SlideContext = {
    pres,
    slide: null as any,
    marginX: 0.5,
    contentWidth: 12.33,  // 13.33 - 0.5 * 2
    startY: 1.25,
    maxY: 7.0,
    currentY: 1.25,
    questionCache,
    blockMathCache,
    inlineMathCache,
    quizCache,
    homeworkCache,
    raceCache,
    echartsCache,
    mindmapCache,
    htmlCache,
  }

  // 第一页：章节标题
  newSlide(ctx, pres, title || 'Chapter')

  // 遍历渲染所有节点
  for (const node of nodes) {
    addNodeToSlide(ctx, node, pres, 0)
  }

  // 生成并下载文件
  const safeName = (title || 'chapter').replace(/[\\/:*?"<>|]/g, '_')
  await pres.writeFile({ fileName: `${safeName}.pptx` })
}
