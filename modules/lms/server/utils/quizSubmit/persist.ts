/**
 * 测验提交：写 userQuizzes + 更新 quizzes.submitCount
 */
import { db, schema } from '@nuxthub/db'
import { and, eq } from 'drizzle-orm'

/** 插入新的 userQuizzes 记录 */
export async function insertUserQuiz(args: {
  userId: number
  courseId: number
  quizCid: number
  records: any
  totalScore: number
  now: Date
}) {
  const { userId, courseId, quizCid, records, totalScore, now } = args
  await db.insert(schema.userQuizzes).values({
    userId, courseId, quizCid,
    records,
    score: String(totalScore),
    submitCount: 1,
    startedAt: now,
    submitedAt: now,
  })
}

/** 更新已有 userQuizzes：取最高分 */
export async function updateUserQuizBestScore(args: {
  userId: number
  courseId: number
  quizCid: number
  records: any
  bestScore: number
  /** 本次提交的得分（用于判断是否刷新了最高分） */
  totalScore: number
  /** 历史最高分（null 表示无记录，但本函数只在已有记录时调用） */
  existingScore: number
  newSubmitCount: number
  existingStartedAt: Date
  now: Date
}) {
  const { userId, courseId, quizCid, records, bestScore, totalScore, existingScore, newSubmitCount, existingStartedAt, now } = args
  // 只有本次提交刷新了最高分时才覆盖每题明细（records），
  // 否则保留历史最高分那次的明细，避免"总分与每题对错"自相矛盾
  const scoreHigher = totalScore > existingScore
  await db.update(schema.userQuizzes).set({
    records: scoreHigher ? records : undefined,
    score: String(bestScore),
    submitCount: newSubmitCount,
    startedAt: existingStartedAt,
    submitedAt: now,
  }).where(and(
    eq(schema.userQuizzes.userId, userId),
    eq(schema.userQuizzes.courseId, courseId),
    eq(schema.userQuizzes.quizCid, quizCid),
  ))
}

/** 增加测验的全局提交计数 */
export async function incrementQuizSubmitCount(courseId: number, quizCid: number, prevCount: number) {
  await db.update(schema.quizzes).set({
    submitCount: (prevCount || 0) + 1,
  }).where(and(
    eq(schema.quizzes.courseId, courseId),
    eq(schema.quizzes.cid, quizCid),
  ))
}
