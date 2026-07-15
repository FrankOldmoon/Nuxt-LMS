/**
 * Chapter scores: assemble each student's score + items (pure function, can be independently unit tested)
 */
import type { ItemStatus } from '../courseProgress/query'

/** Assemble each student's items based on qIds/hIds/cIds + status maps */
export function assembleChapterItems(
  uid: number,
  qIds: number[],
  hIds: number[],
  cIds: number[],
  questionStatusMap: Map<string, ItemStatus>,
  homeworkStatusMap: Map<string, ItemStatus>,
  commentStatusMap: Map<string, ItemStatus>,
) {
  return [
    ...qIds.map(id => ({ id, type: 'question' as const, status: questionStatusMap.get(`${uid}:${id}`) || 'todo' as ItemStatus })),
    ...hIds.map(id => ({ id, type: 'homework' as const, status: homeworkStatusMap.get(`${uid}:${id}`) || 'todo' as ItemStatus })),
    ...cIds.map(id => ({ id, type: 'comment'  as const, status: commentStatusMap.get(`${uid}:${id}`)  || 'todo' as ItemStatus })),
  ]
}

/** Batch assemble all students' { userId, score, taskStatus, items } */
export function assembleChapterScores(
  studentIds: number[],
  qIds: number[],
  hIds: number[],
  cIds: number[],
  chapterDataMap: Map<number, { score: number; taskStatus: Record<string, boolean> }>,
  questionStatusMap: Map<string, ItemStatus>,
  homeworkStatusMap: Map<string, ItemStatus>,
  commentStatusMap: Map<string, ItemStatus>,
) {
  return studentIds.map(uid => {
    const data = chapterDataMap.get(uid) || { score: 0, taskStatus: {} }
    return {
      userId: uid,
      score: data.score,
      taskStatus: data.taskStatus,
      items: assembleChapterItems(uid, qIds, hIds, cIds, questionStatusMap, homeworkStatusMap, commentStatusMap),
    }
  })
}
