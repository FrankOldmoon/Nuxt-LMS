import { db, schema } from "@nuxthub/db"
import { eq, and } from "drizzle-orm"

export default eventHandler(async (event) => {
  // 仅教师/管理员可更新
  await requireRole(event, ['teacher', 'admin'])

  const body = await readBody(event)
  const { course_id, id } = body

  if (!course_id || !id) {
    return cResp(null, '缺少 id 参数', false)
  }

  delete body.cid, body.course_id

  try {
    const result = await db.update(schema.homeworks).set(body).where(and(
      eq(schema.homeworks.courseId, course_id),
      eq(schema.homeworks.cid, id)
    ))
    return cResp(result)
  } catch (error: any) {
    console.error('更新失败:', error)
    return cResp(null, error.message || '更新失败', false)
  }
})
