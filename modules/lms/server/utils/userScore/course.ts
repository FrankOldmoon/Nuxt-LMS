/**
 * Course score: addCourseScore / addCourseScoreMax
 */
import { db, schema } from '@nuxthub/db'
import { findUserCourse, updateUserCourse } from './upsert'

/**
 * Accumulate mode: sub-item scoreKey + total score + exp + coin all increase at the same time
 * @param scoreKey Sub-item field name: questionScore / homeworkScore / ...
 * @param exp Exp increment
 * @param coin Coin increment
 */
export async function addCourseScore(
  userId: number, courseId: number, score: number, scoreKey: string, exp: number = 0, coin: number = 0,
) {
  if (!courseId) return
  const existing = await findUserCourse(userId, courseId)
  const scoreDelta = score || 0; const expDelta = exp || 0; const coinDelta = coin || 0

  if (existing) {
    const updateData: any = {}
    if (scoreDelta !== 0) {
      updateData.score = String((Number(existing.score) || 0) + scoreDelta)
      updateData[scoreKey] = String((Number((existing as any)[scoreKey]) || 0) + scoreDelta)
    }
    if (expDelta !== 0) updateData.exp = (existing.exp || 0) + expDelta
    if (coinDelta !== 0) updateData.coin = (existing.coin || 0) + coinDelta
    if (Object.keys(updateData).length > 0) await updateUserCourse(userId, courseId, updateData)
  } else {
    const insertData: any = { userId, courseId }
    if (scoreDelta !== 0) {
      insertData.score = String(scoreDelta)
      insertData[scoreKey] = String(scoreDelta)
    }
    if (expDelta !== 0) insertData.exp = expDelta
    if (coinDelta !== 0) insertData.coin = coinDelta
    await db.insert(schema.userCourses).values(insertData)
  }
}

/**
 * Highest score mode: sub-item takes max(existing, input) to prevent repeated score farming; total score accumulates by sub-item difference.
 * exp / coin accumulate (no max), consistent with addCourseScore.
 */
export async function addCourseScoreMax(
  userId: number, courseId: number, score: number, scoreKey: string, exp: number = 0, coin: number = 0,
) {
  if (!courseId) return
  const existing = await findUserCourse(userId, courseId)
  const newScore = Math.max(0, Number(score) || 0)
  const expDelta = Math.max(0, Number(exp) || 0)
  const coinDelta = Math.max(0, Number(coin) || 0)

  if (existing) {
    const updateData: any = {}
    const prevItemScore = Number((existing as any)[scoreKey]) || 0
    if (newScore > prevItemScore) {
      updateData[scoreKey] = String(newScore)
      const totalDelta = newScore - prevItemScore
      updateData.score = String((Number(existing.score) || 0) + totalDelta)
    }
    if (expDelta > 0) updateData.exp = (existing.exp || 0) + expDelta
    if (coinDelta > 0) updateData.coin = (existing.coin || 0) + coinDelta
    if (Object.keys(updateData).length > 0) await updateUserCourse(userId, courseId, updateData)
  } else {
    const insertData: any = { userId, courseId }
    if (newScore > 0) {
      insertData.score = String(newScore)
      insertData[scoreKey] = String(newScore)
    }
    if (expDelta > 0) insertData.exp = expDelta
    if (coinDelta > 0) insertData.coin = coinDelta
    await db.insert(schema.userCourses).values(insertData)
  }
}
