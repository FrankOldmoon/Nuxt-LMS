/**
 * 课程分数：addCourseScore / addCourseScoreMax
 */
import { db, schema } from '@nuxthub/db'
import { findUserCourse, updateUserCourse } from './upsert'

/**
 * 累加模式：分项 scoreKey + 总分 + 经验值 + 金币同时增加
 * @param scoreKey 分项字段名：questionScore / homeworkScore / ...
 * @param exp 经验值增量
 * @param coin 金币增量
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
 * 最高分模式：分项取 max(已有, 传入) 防重复刷分；总分按分项差额累加。
 * exp / coin 为累加（不取 max），与 addCourseScore 一致。
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
