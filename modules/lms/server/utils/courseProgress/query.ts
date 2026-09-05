/**
 * 学习进度：批量查询用户在各 item 上的完成状态
 *
 * 输入：用户 id + 课程 id + 该课程下所有章节的 questionIds / homeworkIds / commentIds
 * 输出：3 个 Map<cid, 'done' | 'partial' | 'todo'>
 *  - question: rate >= 1 → done；0 < rate < 1 → partial
 *  - homework / comment: 存在记录 → done
 */
import { db, schema } from '@nuxthub/db'
import { eq, and, inArray } from 'drizzle-orm'

export type ItemStatus = 'done' | 'partial' | 'todo'

/** 批量查询题目完成情况，正确率=1 → done；>0 → partial */
export async function queryQuestionStatus(
  userId: number,
  courseId: number,
  cids: number[],
): Promise<Map<number, ItemStatus>> {
  const map = new Map<number, ItemStatus>()
  if (!cids.length) return map
  const rows = await db
    .select({ questionCid: schema.userQuestions.questionCid, correctRate: schema.userQuestions.correctRate })
    .from(schema.userQuestions)
    .where(and(
      eq(schema.userQuestions.userId, userId),
      eq(schema.userQuestions.courseId, courseId),
      inArray(schema.userQuestions.questionCid, [...new Set(cids)]),
    ))
  for (const q of rows) {
    const rate = Number(q.correctRate) || 0
    map.set(q.questionCid, rate >= 1 ? 'done' : 'partial')
  }
  return map
}

/** 批量查询作业提交情况（仅需判断存在） */
export async function queryHomeworkStatus(
  userId: number,
  courseId: number,
  cids: number[],
): Promise<Map<number, ItemStatus>> {
  const map = new Map<number, ItemStatus>()
  if (!cids.length) return map
  const rows = await db
    .select({ homeworkCid: schema.userHomeworks.homeworkCid })
    .from(schema.userHomeworks)
    .where(and(
      eq(schema.userHomeworks.userId, userId),
      eq(schema.userHomeworks.courseId, courseId),
      inArray(schema.userHomeworks.homeworkCid, [...new Set(cids)]),
    ))
  for (const h of rows) map.set(h.homeworkCid, 'done')
  return map
}

/** 批量查询评论互动情况 */
export async function queryCommentStatus(
  userId: number,
  courseId: number,
  cids: number[],
): Promise<Map<number, ItemStatus>> {
  const map = new Map<number, ItemStatus>()
  if (!cids.length) return map
  const rows = await db
    .select({ commentCid: schema.userComments.commentCid })
    .from(schema.userComments)
    .where(and(
      eq(schema.userComments.userId, userId),
      eq(schema.userComments.courseId, courseId),
      inArray(schema.userComments.commentCid, [...new Set(cids)]),
    ))
  for (const c of rows) map.set(c.commentCid, 'done')
  return map
}

/** 批量查询用户章节得分 + 通过状态 + 任务完成状态 */
export async function queryUserChapterScores(
  userId: number,
  chapterIds: number[],
): Promise<{ scoreMap: Map<number, number>; passMap: Map<number, boolean>; taskStatusMap: Map<number, Record<string, boolean>> }> {
  const scoreMap = new Map<number, number>()
  const passMap = new Map<number, boolean>()
  const taskStatusMap = new Map<number, Record<string, boolean>>()
  if (!chapterIds.length) return { scoreMap, passMap, taskStatusMap }
  const rows = await db
    .select()
    .from(schema.userChapters)
    .where(and(
      eq(schema.userChapters.userId, userId),
      inArray(schema.userChapters.chapterId, chapterIds),
    ))
  for (const uc of rows) {
    scoreMap.set(uc.chapterId, Number(uc.score) || 0)
    passMap.set(uc.chapterId, !!uc.isPass)
    if (uc.taskStatus && typeof uc.taskStatus === 'object') {
      taskStatusMap.set(uc.chapterId, uc.taskStatus as Record<string, boolean>)
    }
  }
  return { scoreMap, passMap, taskStatusMap }
}
