/**
 * 学习进度：装配工具（纯函数，可独立 unit test）
 */
import type { ItemStatus } from './courseProgress/query'

/** 收集所有章节中的 question / homework / comment cid（去重由 query 函数内部处理） */
export function collectAllItemCids(chapters: any[]) {
  const allQuestionCids: number[] = []
  const allHomeworkCids: number[] = []
  const allCommentCids: number[] = []
  for (const ch of chapters) {
    const qIds = ch.questionIds as number[] | null
    const hIds = ch.homeworkIds as number[] | null
    const cIds = ch.commentIds as number[] | null
    if (qIds?.length) allQuestionCids.push(...qIds)
    if (hIds?.length) allHomeworkCids.push(...hIds)
    if (cIds?.length) allCommentCids.push(...cIds)
  }
  return { allQuestionCids, allHomeworkCids, allCommentCids }
}

export type ProgressContext = {
  questionStatusMap: Map<number, ItemStatus>
  homeworkStatusMap: Map<number, ItemStatus>
  commentStatusMap: Map<number, ItemStatus>
  scoreMap: Map<number, number>
  passMap: Map<number, boolean>
  taskStatusMap: Map<number, Record<string, boolean>>
  accessibleSet: Set<number>
}

/** 从章节 content 提取合法 heading id（与 useChapterTask / task-status.post 对齐：含合成章节标题 id） */
function extractHeadingIds(content: any, chapterId: number): string[] {
  const ids: string[] = []
  ids.push(String(chapterId))
  const topBlocks: any[] = Array.isArray(content?.content) ? content.content : []
  for (const child of topBlocks) {
    if (!child || child.type !== 'heading') continue
    const id = child.attrs?.id || child.attrs?.['data-toc-id']
    if (id) ids.push(String(id))
  }
  return ids
}

/** 装配每章节的 items + score + isPass + accessible + progress（标题完成率） */
export function assembleProgress(chapters: any[], ctx: ProgressContext) {
  const { questionStatusMap, homeworkStatusMap, commentStatusMap, scoreMap, passMap, taskStatusMap, accessibleSet } = ctx
  return chapters.map((ch) => {
    const qIds = (ch.questionIds as number[] | null) || []
    const hIds = (ch.homeworkIds as number[] | null) || []
    const cIds = (ch.commentIds as number[] | null) || []
    const items = [
      ...qIds.map(id => ({ id, type: 'question', status: questionStatusMap.get(id) || 'todo' })),
      ...hIds.map(id => ({ id, type: 'homework', status: homeworkStatusMap.get(id) || 'todo' })),
      ...cIds.map(id => ({ id, type: 'comment', status: commentStatusMap.get(id) || 'todo' })),
    ]
    // 标题完成率（与 toc progressPercent 同口径）：已完成 heading / 总 heading
    const headings = extractHeadingIds(ch.content, ch.id)
    const taskStatus = taskStatusMap.get(ch.id) || {}
    const doneHeadings = headings.filter(id => taskStatus[id] === true).length
    const progress = headings.length > 0
      ? Math.round((doneHeadings / headings.length) * 100)
      : null
    return {
      chapterId: ch.id,
      chapterName: ch.name,
      score: scoreMap.get(ch.id) || 0,
      isPass: passMap.get(ch.id) || false,
      isOpen: !!ch.isOpen,
      accessible: accessibleSet.has(ch.id),
      progress,
      items,
    }
  })
}
