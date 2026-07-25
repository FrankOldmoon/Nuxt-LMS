import { db, schema } from "@nuxthub/db"
import { eq, and } from "drizzle-orm"

export default eventHandler(async (event) => {
  await requireRole(event, ['teacher', 'admin'])

  const body = await readBody(event)
  const { course_id, id } = body

  if (!course_id || !id) {
    return cResp(null, '缺少 id 参数', false)
  }

  delete body.cid, body.course_id, body.id

  try {
    const result = await db.update(schema.comments).set(body).where(and(
      eq(schema.comments.courseId, course_id),
      eq(schema.comments.cid, id)
    ))
    return cResp(result)
  } catch (error: any) {
    console.error('更新评论失败:', error)
    return cResp(null, error.message || '更新失败', false)
  }
})
