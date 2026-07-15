/**
 * userQuestions write logic (shared by questions/submit + aichat/award)
 *
 * Differences between the two:
 *  - questions/submit tracks records / firstRecord / wrongCount / submitCount increments
 *  - aichat/award does not track these (only score + correctRate + firstRight)
 *
 * Use `trackXxx` flags to choose whether to write the corresponding fields.
 */
import { db, schema } from '@nuxthub/db'
import { and, eq } from 'drizzle-orm'
import type { QuestionUpsertInput, QuestionUpsertResult } from './types'

/**
 * Insert or update a userQuestions row; returns the existing state for the caller to calculate exp/score.
 */
export async function upsertUserQuestion(input: QuestionUpsertInput): Promise<QuestionUpsertResult> {
  const { userId, courseId, questionCid, rate, score, isCorrect, records, trackWrongCount, trackSubmitCount } = input

  const existing = await db.query.userQuestions.findFirst({
    where: and(
      eq(schema.userQuestions.userId, userId),
      eq(schema.userQuestions.courseId, courseId),
      eq(schema.userQuestions.questionCid, questionCid),
    ),
  })

  const newSubmitCount = (existing?.submitCount || 0) + 1
  const wasFirstRight = existing?.firstRight ? true : false
  const scoreDelta = (isCorrect && !wasFirstRight) ? score : 0

  if (existing) {
    const updateData: any = {
      score: String(score),
      correctRate: String(rate),
      firstRight: existing.firstRight || isCorrect,
    }
    if (trackWrongCount) {
      updateData.wrongCount = isCorrect ? (existing.wrongCount || 0) : (existing.wrongCount || 0) + 1
    }
    if (trackSubmitCount) {
      updateData.submitCount = newSubmitCount
    }
    if (records !== undefined) {
      updateData.records = records
    }
    await db.update(schema.userQuestions).set(updateData).where(and(
      eq(schema.userQuestions.userId, userId),
      eq(schema.userQuestions.courseId, courseId),
      eq(schema.userQuestions.questionCid, questionCid),
    ))
  } else {
    const insertData: any = {
      userId, courseId, questionCid,
      score: String(score),
      firstRight: isCorrect,
      correctRate: String(rate),
    }
    if (trackWrongCount) insertData.wrongCount = isCorrect ? 0 : 1
    if (trackSubmitCount) insertData.submitCount = 1
    if (records !== undefined) {
      insertData.records = records
      insertData.firstRecord = records
    }
    await db.insert(schema.userQuestions).values(insertData)
  }

  return { existing, newSubmitCount, wasFirstRight, scoreDelta }
}
