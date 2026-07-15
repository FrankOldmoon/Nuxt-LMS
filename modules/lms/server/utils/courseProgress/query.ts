/**
 * Learning progress: batch query the user's completion status on each item
 *
 * Input: user id + course id + questionIds / homeworkIds / commentIds of all chapters in the course
 * Output: 3 Maps<cid, 'done' | 'partial' | 'todo'>
 *  - question: rate >= 1 → done; 0 < rate < 1 → partial
 *  - homework / comment: record exists → done
 */
import { db, schema } from '@nuxthub/db'
import { eq, and, inArray } from 'drizzle-orm'

export type ItemStatus = 'done' | 'partial' | 'todo'

/** Batch query question completion, correct rate=1 → done; >0 → partial */
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

/** Batch query homework submission (only need to check existence) */
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

/** Batch query comment interaction */
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

/** Batch query user's chapter scores + pass status */
export async function queryUserChapterScores(
  userId: number,
  chapterIds: number[],
): Promise<{ scoreMap: Map<number, number>; passMap: Map<number, boolean> }> {
  const scoreMap = new Map<number, number>()
  const passMap = new Map<number, boolean>()
  if (!chapterIds.length) return { scoreMap, passMap }
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
  }
  return { scoreMap, passMap }
}
