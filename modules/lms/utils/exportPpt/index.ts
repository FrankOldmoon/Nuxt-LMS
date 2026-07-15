/**
 * Export Tiptap JSON chapter content as PPT using pptxgenjs (CDN)
 * References the rendering format of modules/lms/components/ueditor/render, keeping content and style consistent
 *
 * Pagination strategy:
 *  - Each h1/h2 starts a new slide (heading as the slide title)
 *  - h3-h6 serve as sub-headings within the current slide
 *  - Content that is too long automatically overflows to a new slide
 *  - pageBreak forces a page break
 *
 * Pre-rendering:
 *  - vue question nodes → pre-fetch question data (parallel API requests)
 *  - blockMath nodes → KaTeX + html2canvas rendered as PNG images
 *  - inlineMath nodes → KaTeX rendered as Unicode text (replaces LaTeX source in paragraphs)
 */

import type { SlideContext, MathImage } from './types'
import { collectVueQuestionCids } from './questionUtils'
import { collectVueContentCids, fetchVueContent, extractQuizQuestionCids, extractRaceQuestionCids } from './vueDataFetch'
import { prerenderMathNodes } from './mathRender'
import { prerenderImageNodes } from './imageRender'
import { addNodeToSlide } from './nodes'
import { newSlide } from './slideUtils'

// ═══════════════════════════════════════
// Dynamically load pptxgenjs from CDN
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
// Main export function
// ═══════════════════════════════════════

/**
 * Export Tiptap JSON chapter content as PPT and download
 * @param content Tiptap JSON document (doc node or { json: ... } wrapper)
 * @param title Chapter title (used as the first slide title and file name)
 * @param courseId Course ID (used to pre-fetch question data for vue question nodes)
 */
export async function exportChapterToPpt(content: any, title: string, courseId?: number): Promise<void> {
  if (typeof window === 'undefined') {
    throw new Error('PPT export can only be used in the browser')
  }

  // Parse Tiptap JSON (compatible with both { json: ... } wrapper and bare doc forms)
  const json = content?.json ?? content
  const doc = json?.type === 'doc'
    ? json
    : { type: 'doc', content: Array.isArray(json) ? json : (json?.content || []) }
  const nodes = doc.content || []

  // ═══════════════════════════════════════
  // Pre-fetch phase: quiz/homework/race → nested questions → all questions
  // ═══════════════════════════════════════

  // 1. Collect cids of vue question nodes (including those nested in quiz/race)
  const questionCache = new Map<number, any>()
  const questionCids: number[] = []
  collectVueQuestionCids(nodes, questionCids)

  // 2. Collect cids of vue quiz/homework/race nodes, pre-fetch in parallel
  const quizCids: number[] = []
  const homeworkCids: number[] = []
  const raceCids: number[] = []
  collectVueContentCids(nodes, quizCids, homeworkCids, raceCids)

  const quizCache = new Map<number, any>()
  const homeworkCache = new Map<number, any>()
  const raceCache = new Map<number, any>()
  await fetchVueContent(courseId || 0, quizCids, homeworkCids, raceCids, quizCache, homeworkCache, raceCache)

  // 3. Extract nested question cids from pre-fetched quiz/race, merge into questionCids
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

  // 4. Pre-fetch all questions in parallel (including nested questions)
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
        // Silently ignored (question may have been deleted or no permission)
      }
    }))
  }

  // ═══════════════════════════════════════
  // Pre-render phase: math formulas + echarts/mindmap/html images
  // ═══════════════════════════════════════

  // Pre-render math formulas (blockMath → PNG image, inlineMath → Unicode text)
  // Pass in cache to scan for math formulas in nested content (question content/options, quiz/homework content)
  const blockMathCache = new Map<string, MathImage | null>()
  const inlineMathCache = new Map<string, string>()
  await prerenderMathNodes(nodes, blockMathCache, inlineMathCache, questionCache, quizCache, homeworkCache)

  // Pre-render echarts/mindmap/html (parallel → PNG image cache)
  const echartsCache = new Map<any, MathImage | null>()
  const mindmapCache = new Map<string, MathImage | null>()
  const htmlCache = new Map<string, MathImage | null>()
  await prerenderImageNodes(nodes, echartsCache, mindmapCache, htmlCache)

  // Load pptxgenjs
  const PptxGenJS = await loadPptxGenJS()
  const pres = new PptxGenJS()
  pres.layout = 'LAYOUT_WIDE'  // 13.33 × 7.5 inches
  pres.author = 'LMS'
  pres.company = 'LMS'

  // Page number
  pres.slideNumber = {
    x: 12.6,
    y: 7.15,
    w: 0.5,
    h: 0.3,
    fontSize: 10,
    color: '999999',
    align: 'right',
  }

  // Slide context
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

  // First slide: chapter title
  newSlide(ctx, pres, title || 'Chapter')

  // Iterate and render all nodes
  for (const node of nodes) {
    addNodeToSlide(ctx, node, pres, 0)
  }

  // Generate and download the file
  const safeName = (title || 'chapter').replace(/[\\/:*?"<>|]/g, '_')
  await pres.writeFile({ fileName: `${safeName}.pptx` })
}
