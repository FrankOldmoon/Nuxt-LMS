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

  try {
    // 查询作业满分：用于把打分钳制到 [0, 满分]，防止越界分数入库
    const homework = await db.query.homeworks.findFirst({
      where: and(
        eq(schema.homeworks.courseId, courseId),
        eq(schema.homeworks.cid, Number(homework_cid))
      )
    })
    const maxScore = Number((homework as any)?.point) || 0

    let newScore = score === null || score === '' ? null : Number(score)
    // 钳制：非法值 → null；负数 → 0；超过满分 → 满分
    if (newScore != null && !Number.isFinite(newScore)) newScore = null
    if (newScore != null) {
      if (newScore < 0) newScore = 0
      if (maxScore > 0 && newScore > maxScore) newScore = maxScore
    }

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

    const scoreValue = newScore != null ? String(newScore) : null
    let saved: any
    if (existing) {
      const result = await db.update(schema.userHomeworks).set({
        score: scoreValue,
      }).where(and(
        eq(schema.userHomeworks.userId, userId),
        eq(schema.userHomeworks.courseId, courseId),
        eq(schema.userHomeworks.homeworkCid, Number(homework_cid))
      )).returning()
      saved = result[0]
    } else {
      // 学生未提交也允许打分：新建「仅评分」记录（record 为空，不计入完成）
      const inserted = await db.insert(schema.userHomeworks).values({
        userId,
        courseId,
        homeworkCid: Number(homework_cid),
        score: scoreValue,
      }).returning()
      saved = inserted[0]
    }

    if (!saved) {
      return cResp(null, '保存失败', false)
    }

    // 更新 userChapters.score
    if (scoreDelta !== 0) {
      await addChapterScore(userId, chapterId, scoreDelta)
    }

    // 更新 userCourses：homeworkScore + score
    await addCourseScore(userId, courseId, scoreDelta, 'homeworkScore', 0, 0)

    // 分数有变化时给该学生发定向通知（个人通知，读后硬删除；失败不影响打分结果）
    if (newScore != null && scoreDelta !== 0) {
      try {
        await notifyUser(userId, '作业已评分', `你的作业已评分：${newScore} 分`, {
          type: 'homeworkGraded',
          courseId,
          homeworkCid: Number(homework_cid),
          score: newScore,
        })
      } catch { /* 通知失败忽略 */ }
    }

    return cResp(saved)
  } catch (error: any) {
    console.error('打分失败:', error)
    return cResp(null, error.message || '打分失败', false)
  }
})
