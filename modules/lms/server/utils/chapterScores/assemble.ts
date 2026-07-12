/**
 * 章节得分：装配每学生的 score + items（纯函数，可独立 unit test）
 */
import type { ItemStatus } from '../courseProgress/query'

/** 根据 qIds/hIds/cIds + 状态 map 组装每个学生的 items */
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

/** 批量装配所有学生的 { userId, score, taskStatus, items } */
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
