/**
 * 章节得分：批量查询每个学生在 question / homework / comment 上的状态
 *
 * 与 courseProgress/query.ts 的区别：
 *  - 面向"班级所有学生"（传入 studentIds[]）
 *  - 复合主键：userId + cid
 *  - 返回 key 形如 "userId:cid"，handler 据此查表
 */
import { db, schema } from '@nuxthub/db'
import { and, eq, inArray } from 'drizzle-orm'
import type { ItemStatus } from '../courseProgress/query'
import { homeworkSubmitted } from '../submit/record'

/** 批量查询某课程下，指定学生在 question cids 上的状态 */
export async function queryStudentQuestionStatus(
  courseId: number,
  studentIds: number[],
  cids: number[],
): Promise<Map<string, ItemStatus>> {
  const map = new Map<string, ItemStatus>()
  if (!cids.length || !studentIds.length) return map
  const rows = await db
    .select({
      userId: schema.userQuestions.userId,
      questionCid: schema.userQuestions.questionCid,
      correctRate: schema.userQuestions.correctRate,
    })
    .from(schema.userQuestions)
    .where(and(
      eq(schema.userQuestions.courseId, courseId),
      inArray(schema.userQuestions.userId, studentIds),
      inArray(schema.userQuestions.questionCid, [...new Set(cids)]),
    ))
  for (const q of rows) {
    const rate = Number(q.correctRate) || 0
    map.set(`${q.userId}:${q.questionCid}`, rate >= 1 ? 'done' : 'partial')
  }
  return map
}

/** 批量查询某课程下，指定学生在 homework cids 上的状态 */
export async function queryStudentHomeworkStatus(
  courseId: number,
  studentIds: number[],
  cids: number[],
): Promise<Map<string, ItemStatus>> {
  const map = new Map<string, ItemStatus>()
  if (!cids.length || !studentIds.length) return map
  const rows = await db
    .select({ userId: schema.userHomeworks.userId, homeworkCid: schema.userHomeworks.homeworkCid })
    .from(schema.userHomeworks)
    .where(and(
      eq(schema.userHomeworks.courseId, courseId),
      inArray(schema.userHomeworks.userId, studentIds),
      inArray(schema.userHomeworks.homeworkCid, [...new Set(cids)]),
      homeworkSubmitted(),
    ))
  for (const h of rows) map.set(`${h.userId}:${h.homeworkCid}`, 'done')
  return map
}

/** 批量查询某课程下，指定学生在 comment cids 上的状态 */
export async function queryStudentCommentStatus(
  courseId: number,
  studentIds: number[],
  cids: number[],
): Promise<Map<string, ItemStatus>> {
  const map = new Map<string, ItemStatus>()
  if (!cids.length || !studentIds.length) return map
  const rows = await db
    .select({ userId: schema.userComments.userId, commentCid: schema.userComments.commentCid })
    .from(schema.userComments)
    .where(and(
      eq(schema.userComments.courseId, courseId),
      inArray(schema.userComments.userId, studentIds),
      inArray(schema.userComments.commentCid, [...new Set(cids)]),
    ))
  for (const c of rows) map.set(`${c.userId}:${c.commentCid}`, 'done')
  return map
}

/** 批量查询学生在某章节的得分 + 任务完成状态（taskStatus: headingId → 是否完成） */
export async function queryStudentChapterScores(
  chapterId: number,
  studentIds: number[],
): Promise<Map<number, { score: number; taskStatus: Record<string, boolean> }>> {
  const map = new Map<number, { score: number; taskStatus: Record<string, boolean> }>()
  if (!studentIds.length) return map
  const rows = await db
    .select({
      userId: schema.userChapters.userId,
      score: schema.userChapters.score,
      taskStatus: schema.userChapters.taskStatus,
    })
    .from(schema.userChapters)
    .where(and(
      eq(schema.userChapters.chapterId, chapterId),
      inArray(schema.userChapters.userId, studentIds),
    ))
  for (const uc of rows) {
    map.set(uc.userId, {
      score: Number(uc.score) || 0,
      taskStatus: (uc.taskStatus as Record<string, boolean>) || {},
    })
  }
  return map
}
