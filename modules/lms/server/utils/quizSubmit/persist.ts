/**
 * Quiz submit: write userQuizzes + update quizzes.submitCount
 */
import { db, schema } from '@nuxthub/db'
import { and, eq } from 'drizzle-orm'

/** Insert a new userQuizzes record */
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

/** Update existing userQuizzes: keep the highest score */
export async function updateUserQuizBestScore(args: {
  userId: number
  courseId: number
  quizCid: number
  records: any
  bestScore: number
  newSubmitCount: number
  existingStartedAt: Date
  now: Date
}) {
  const { userId, courseId, quizCid, records, bestScore, newSubmitCount, existingStartedAt, now } = args
  await db.update(schema.userQuizzes).set({
    records,
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

/** Increment the global submit count of the quiz */
export async function incrementQuizSubmitCount(courseId: number, quizCid: number, prevCount: number) {
  await db.update(schema.quizzes).set({
    submitCount: (prevCount || 0) + 1,
  }).where(and(
    eq(schema.quizzes.courseId, courseId),
    eq(schema.quizzes.cid, quizCid),
  ))
}
