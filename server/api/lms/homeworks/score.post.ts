import { db, schema } from "@nuxthub/db"
import { eq, and } from "drizzle-orm"

export default eventHandler(async (event) => {
  const user = await requireRole(event, ['teacher', 'admin'])

  const body = await readBody(event)
  const { course_id, homework_cid, user_id, score } = body

  if (!course_id || !homework_cid || !user_id) {
    return cResp(null, '缺少 course_id、homework_cid 或 user_id 参数', false)
  }

  try {
    const result = await db.update(schema.userHomeworks).set({
      score: score === null || score === '' ? null : String(score),
    }).where(and(
      eq(schema.userHomeworks.userId, Number(user_id)),
      eq(schema.userHomeworks.courseId, Number(course_id)),
      eq(schema.userHomeworks.homeworkCid, Number(homework_cid))
    )).returning()

    if (!result.length) {
      return cResp(null, '未找到该学生的提交记录', false)
    }
    return cResp(result[0])
  } catch (error: any) {
    console.error('打分失败:', error)
    return cResp(null, error.statusMessage || '打分失败', false)
  }
})
