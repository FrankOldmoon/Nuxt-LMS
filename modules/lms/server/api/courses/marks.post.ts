/**
 * 加减分：批量更新 user_courses 的 attitude_score 字段
 * POST /api/courses/marks
 * body: { course_id, user_ids: number[], delta: number }
 *
 * delta 为正则加分，为负则减分。仅教师/管理员可调用。
 */
import { db, schema } from '@nuxthub/db'
import { eq, and, inArray, sql } from 'drizzle-orm'

export default eventHandler(async (event) => {
  await requireRole(event, ['teacher', 'admin'])

  const body = await readBody(event)
  const { course_id, user_ids, delta, chapter_id } = body

  if (!course_id || !Array.isArray(user_ids) || user_ids.length === 0) {
    return cResp(null, '缺少 course_id 或 user_ids 参数', false)
  }
  const numDelta = Number(delta)
  if (isNaN(numDelta) || numDelta === 0) {
    return cResp(null, 'delta 无效', false)
  }

  const courseId = Number(course_id)
  const userIds = user_ids.map(Number)
  const chapterId = Number(chapter_id) || 0

  try {
    // 对已有记录执行加减分（COALESCE 防 NULL）
    await db.update(schema.userCourses)
      .set({
        attitudeScore: sql`COALESCE(${schema.userCourses.attitudeScore}, 0) + ${numDelta}`,
      })
      .where(and(
        eq(schema.userCourses.courseId, courseId),
        inArray(schema.userCourses.userId, userIds),
      ))

    // 对没有记录的学生创建初始记录
    const existing = await db
      .select({ userId: schema.userCourses.userId })
      .from(schema.userCourses)
      .where(and(
        eq(schema.userCourses.courseId, courseId),
        inArray(schema.userCourses.userId, userIds),
      ))
    const existingIds = new Set(existing.map(r => r.userId))
    const missingIds = userIds.filter(id => !existingIds.has(id))
    if (missingIds.length > 0) {
      await db.insert(schema.userCourses).values(
        missingIds.map(uid => ({
          userId: uid,
          courseId,
          attitudeScore: String(Math.max(0, numDelta)),
        }))
      )
    }

    // 若传入 chapter_id，同步给每个被选中学生加/减章节分
    if (chapterId) {
      for (const uid of userIds) {
        await addChapterScore(uid, chapterId, numDelta)
      }
    }

    return cResp({ success: true, delta: numDelta })
  } catch (error: any) {
    console.error('加减分失败:', error)
    return cResp(null, error.message || '加减分失败', false)
  }
})
