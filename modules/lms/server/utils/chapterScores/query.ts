/**
 * Chapter scores: batch query each student's status on question / homework / comment
 *
 * Differences from courseProgress/query.ts:
 *  - Targets "all students in a class" (pass in studentIds[])
 *  - Composite primary key: userId + cid
 *  - Returns key in the form "userId:cid", the handler looks up the table accordingly
 */
import { db, schema } from '@nuxthub/db'
import { and, eq, inArray } from 'drizzle-orm'
import type { ItemStatus } from '../courseProgress/query'

/** Batch query the status of specified students on question cids under a course */
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

/** Batch query the status of specified students on homework cids under a course */
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
    ))
  for (const h of rows) map.set(`${h.userId}:${h.homeworkCid}`, 'done')
  return map
}

/** Batch query the status of specified students on comment cids under a course */
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

/** Batch query students' scores + task completion status for a chapter (taskStatus: headingId → whether completed) */
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
