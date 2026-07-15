/**
 * Quiz submit: start_only mode (only records the start time, does not calculate the score)
 *
 * Three cases:
 *  1. Existing in-progress record (!existing.submitedAt) → do not overwrite startedAt
 *  2. Existing submitted record → reset startedAt / submitedAt=null / records=[]
 *  3. Completely new record → insert
 */
import { db, schema } from '@nuxthub/db'
import { and, eq } from 'drizzle-orm'

export type StartOnlyResult = { startedAt: Date; created: boolean }

export async function handleQuizStartOnly(
  userId: number,
  courseId: number,
  quizCid: number,
  existing: { startedAt: Date; submitedAt: Date | null } | null,
  now: Date = new Date(),
): Promise<StartOnlyResult> {
  // 1. Existing in-progress record → do not overwrite
  if (existing && !existing.submitedAt) {
    return { startedAt: existing.startedAt, created: false }
  }
  // 2. Existing submitted record → reset
  if (existing) {
    await db.update(schema.userQuizzes).set({
      startedAt: now,
      submitedAt: null,
      records: [],
    }).where(and(
      eq(schema.userQuizzes.userId, userId),
      eq(schema.userQuizzes.courseId, courseId),
      eq(schema.userQuizzes.quizCid, quizCid),
    ))
    return { startedAt: now, created: false }
  }
  // 3. Create a new in-progress record
  await db.insert(schema.userQuizzes).values({
    userId,
    courseId,
    quizCid,
    records: [],
    score: '0',
    submitCount: 0,
    startedAt: now,
    submitedAt: null,
  })
  return { startedAt: now, created: true }
}
