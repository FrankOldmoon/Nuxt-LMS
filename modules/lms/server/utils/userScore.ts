import { db, schema } from "@nuxthub/db"
import { eq, and } from "drizzle-orm"

/**
 * 更新 userChapters 的 score（加分）
 */
export async function addChapterScore(userId: number, chapterId: number, score: number) {
  if (!chapterId || score === 0) return
  const existing = await db.query.userChapters.findFirst({
    where: and(eq(schema.userChapters.userId, userId), eq(schema.userChapters.chapterId, chapterId)),
  })
  if (existing) {
    await db.update(schema.userChapters).set({
      score: String((Number(existing.score) || 0) + score),
    }).where(and(eq(schema.userChapters.userId, userId), eq(schema.userChapters.chapterId, chapterId)))
  } else {
    await db.insert(schema.userChapters).values({
      userId,
      chapterId,
      score: String(score),
    })
  }
}

/**
 * 更新 userCourses 的分项分数 + 总分 + 经验值
 * @param scoreKey 分项字段名：questionScore / homeworkScore / commentScore / quizScore / raceScore / extraScore
 */
export async function addCourseScore(userId: number, courseId: number, score: number, scoreKey: string, exp: number = 0) {
  if (!courseId) return
  const existing = await db.query.userCourses.findFirst({
    where: and(eq(schema.userCourses.userId, userId), eq(schema.userCourses.courseId, courseId)),
  })

  const scoreDelta = score || 0
  const expDelta = exp || 0

  if (existing) {
    const updateData: any = {}
    if (scoreDelta !== 0) {
      updateData.score = String((Number(existing.score) || 0) + scoreDelta)
      updateData[scoreKey] = String((Number((existing as any)[scoreKey]) || 0) + scoreDelta)
    }
    if (expDelta !== 0) {
      updateData.exp = (existing.exp || 0) + expDelta
    }
    if (Object.keys(updateData).length > 0) {
      await db.update(schema.userCourses).set(updateData)
        .where(and(eq(schema.userCourses.userId, userId), eq(schema.userCourses.courseId, courseId)))
    }
  } else {
    const insertData: any = {
      userId,
      courseId,
    }
    if (scoreDelta !== 0) {
      insertData.score = String(scoreDelta)
      insertData[scoreKey] = String(scoreDelta)
    }
    if (expDelta !== 0) {
      insertData.exp = expDelta
    }
    await db.insert(schema.userCourses).values(insertData)
  }
}

/**
 * "最高分"模式更新 userCourses 分项：与累加不同，分项字段取 max(已有, 传入) 而非相加。
 * 适用于 quiz/race 这类"取最高分"的场景，防止重复提交刷分。
 * exp 仍按累加（防刷由调用方控制，如只在首次及格时给 passBonusExp）。
 * @param scoreKey 分项字段名
 */
export async function addCourseScoreMax(userId: number, courseId: number, score: number, scoreKey: string, exp: number = 0) {
  if (!courseId) return
  const existing = await db.query.userCourses.findFirst({
    where: and(eq(schema.userCourses.userId, userId), eq(schema.userCourses.courseId, courseId)),
  })

  const newScore = Math.max(0, Number(score) || 0)
  const expDelta = Math.max(0, Number(exp) || 0)

  if (existing) {
    const updateData: any = {}
    // 分项：取最高
    const prevItemScore = Number((existing as any)[scoreKey]) || 0
    if (newScore > prevItemScore) {
      updateData[scoreKey] = String(newScore)
    }
    // 总分：按"分项最高 - 旧分项"做差额累加（避免因一项最高就拉爆总分）
    // 如果其他分项不变，等价于 + (newScore - prevItemScore)
    if (newScore > prevItemScore) {
      const totalDelta = newScore - prevItemScore
      updateData.score = String((Number(existing.score) || 0) + totalDelta)
    }
    // 经验：累加
    if (expDelta > 0) {
      updateData.exp = (existing.exp || 0) + expDelta
    }
    if (Object.keys(updateData).length > 0) {
      await db.update(schema.userCourses).set(updateData)
        .where(and(eq(schema.userCourses.userId, userId), eq(schema.userCourses.courseId, courseId)))
    }
  } else {
    const insertData: any = {
      userId,
      courseId,
    }
    if (newScore > 0) {
      insertData.score = String(newScore)
      insertData[scoreKey] = String(newScore)
    }
    if (expDelta > 0) {
      insertData.exp = expDelta
    }
    await db.insert(schema.userCourses).values(insertData)
  }
}
