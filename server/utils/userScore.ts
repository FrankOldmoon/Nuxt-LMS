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
