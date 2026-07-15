/**
 * Learning progress: assembly utility (pure function, can be independently unit tested)
 */
import type { ItemStatus } from './courseProgress/query'

/** Collect question / homework / comment cids from all chapters (deduplication is handled inside the query function) */
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
  accessibleSet: Set<number>
}

/** Assemble each chapter's items + score + isPass + accessible */
export function assembleProgress(chapters: any[], ctx: ProgressContext) {
  const { questionStatusMap, homeworkStatusMap, commentStatusMap, scoreMap, passMap, accessibleSet } = ctx
  return chapters.map((ch) => {
    const qIds = (ch.questionIds as number[] | null) || []
    const hIds = (ch.homeworkIds as number[] | null) || []
    const cIds = (ch.commentIds as number[] | null) || []
    const items = [
      ...qIds.map(id => ({ id, type: 'question', status: questionStatusMap.get(id) || 'todo' })),
      ...hIds.map(id => ({ id, type: 'homework', status: homeworkStatusMap.get(id) || 'todo' })),
      ...cIds.map(id => ({ id, type: 'comment', status: commentStatusMap.get(id) || 'todo' })),
    ]
    return {
      chapterId: ch.id,
      chapterName: ch.name,
      score: scoreMap.get(ch.id) || 0,
      isPass: passMap.get(ch.id) || false,
      isOpen: !!ch.isOpen,
      accessible: accessibleSet.has(ch.id),
      items,
    }
  })
}
