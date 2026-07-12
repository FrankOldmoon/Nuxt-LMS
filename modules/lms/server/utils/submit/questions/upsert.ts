/**
 * userQuestions 写入逻辑（questions/submit + aichat/award 共用）
 *
 * 两者的差异：
 *  - questions/submit 跟踪 records / firstRecord / wrongCount / submitCount 增量
 *  - aichat/award 不跟踪这些（仅 score + correctRate + firstRight）
 *
 * 通过 `trackXxx` 标志位选择是否写入对应字段。
 */
import { db, schema } from '@nuxthub/db'
import { and, eq } from 'drizzle-orm'
import type { QuestionUpsertInput, QuestionUpsertResult } from './types'

/**
 * 写入或更新 userQuestions 行；返回 existing 状态以供调用方计算经验/分数。
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
