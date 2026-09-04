import { db, schema } from "@nuxthub/db"
import { eq, and } from "drizzle-orm"

// 教师评语 / 标优作业接口
// 仅更新评语(comment)与优秀标记(excellent)；打分仍走 /api/homeworks/score（含课程/章节总分联动）
export default eventHandler(async (event) => {
  await requireRole(event, ['teacher', 'admin'])

  const body = await readBody(event)
  const { course_id, homework_cid, user_id, comment, excellent } = body

  if (!course_id || !homework_cid || !user_id) {
    return cResp(null, '缺少 course_id、homework_cid 或 user_id 参数', false)
  }

  const courseId = Number(course_id)
  const homeworkCid = Number(homework_cid)
  const userId = Number(user_id)

  // 评语为纯文本，允许清空（传空串即清空）
  const updateData: Record<string, any> = {}
  if (comment !== undefined) updateData.comment = String(comment ?? '')
  if (excellent !== undefined) updateData.excellent = !!excellent
  if (Object.keys(updateData).length === 0) {
    return cResp(null, '没有需要更新的字段', false)
  }

  try {
    const result = await db.update(schema.userHomeworks).set(updateData).where(and(
      eq(schema.userHomeworks.userId, userId),
      eq(schema.userHomeworks.courseId, courseId),
      eq(schema.userHomeworks.homeworkCid, homeworkCid)
    )).returning()

    if (!result.length) {
      return cResp(null, '未找到该学生的提交记录', false)
    }
    return cResp(result[0])
  } catch (error: any) {
    console.error('评语/标优失败:', error)
    return cResp(null, error.message || '更新失败', false)
  }
})