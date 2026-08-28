/**
 * 额外分：直接设置 user_courses.external_score 字段
 * POST /api/courses/extra-score
 * body: { course_id, user_id, extra_score }
 *
 * 教师在成绩表中为单个学生输入额外分并保存。仅教师/管理员可调用。
 */
import { db, schema } from '@nuxthub/db'

export default eventHandler(async (event) => {
  await requireRole(event, ['teacher', 'admin'])

  const body = await readBody(event)
  const { course_id, user_id, extra_score } = body

  if (!course_id || !user_id) {
    return cResp(null, '缺少 course_id 或 user_id 参数', false)
  }
  const numScore = Number(extra_score)
  if (isNaN(numScore)) {
    return cResp(null, 'extra_score 无效', false)
  }

  const courseId = Number(course_id)
  const userId = Number(user_id)

  try {
    // upsert：已有记录则更新 external_score，否则插入新记录
    await db.insert(schema.userCourses)
      .values({
        userId,
        courseId,
        externalScore: String(numScore),
      })
      .onConflictDoUpdate({
        target: [schema.userCourses.userId, schema.userCourses.courseId],
        set: {
          externalScore: String(numScore),
        },
      })

    return cResp({ success: true, externalScore: numScore })
  } catch (error: any) {
    console.error('保存额外分失败:', error)
    return cResp(null, error.message || '保存额外分失败', false)
  }
})
