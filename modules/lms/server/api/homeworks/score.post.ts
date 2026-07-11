import { db, schema } from "@nuxthub/db"
import { eq, and } from "drizzle-orm"

export default eventHandler(async (event) => {
  const user = await requireRole(event, ['teacher', 'admin'])

  const body = await readBody(event)
  const { course_id, chapter_id, homework_cid, user_id, score } = body

  if (!course_id || !homework_cid || !user_id) {
    return cResp(null, '缺少 course_id、homework_cid 或 user_id 参数', false)
  }

  const courseId = Number(course_id)
  const chapterId = Number(chapter_id) || 0
  const userId = Number(user_id)
  const newScore = score === null || score === '' ? null : Number(score)

  try {
    // 查询旧分数
    const existing = await db.query.userHomeworks.findFirst({
      where: and(
        eq(schema.userHomeworks.userId, userId),
        eq(schema.userHomeworks.courseId, courseId),
        eq(schema.userHomeworks.homeworkCid, Number(homework_cid))
      )
    })

    const oldScore = existing ? Number(existing.score) || 0 : 0
    const scoreDelta = newScore != null ? (newScore - oldScore) : -oldScore

    // 更新 userHomeworks 分数
    const result = await db.update(schema.userHomeworks).set({
      score: newScore != null ? String(newScore) : null,
    }).where(and(
      eq(schema.userHomeworks.userId, userId),
      eq(schema.userHomeworks.courseId, courseId),
      eq(schema.userHomeworks.homeworkCid, Number(homework_cid))
    )).returning()

    if (!result.length) {
      return cResp(null, '未找到该学生的提交记录', false)
    }

    // 更新 userChapters.score
    if (scoreDelta !== 0) {
      await addChapterScore(userId, chapterId, scoreDelta)
    }

    // 更新 userCourses：homeworkScore + score
    await addCourseScore(userId, courseId, scoreDelta, 'homeworkScore', 0)

    return cResp(result[0])
  } catch (error: any) {
    console.error('打分失败:', error)
    return cResp(null, error.message || '打分失败', false)
  }
})
