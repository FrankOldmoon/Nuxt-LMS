import { db, schema } from "@nuxthub/db"
import { eq, and } from "drizzle-orm"  // 仅需导入 eq 和 and

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
    const result = await db.update(schema.questions).set(body).where(and(
      eq(schema.questions.courseId, course_id),
      eq(schema.questions.cid, id)
    ))
    return cResp(result)
  } catch (error: any) {
    console.error('更新失败:', error)
    return cResp(null, error.statusMessage || '更新失败', false)
  }
})
