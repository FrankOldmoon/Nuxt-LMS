import { db, schema } from "@nuxthub/db"
import { eq, and } from "drizzle-orm"

// 审核评论：老师/管理员将待审核（audit）的评论置为已发布（published），随后对普通用户可见
export default eventHandler(async (event) => {
  await requireRole(event, ['teacher', 'admin'])

  const body = await readBody(event)
  const { course_id, cid } = body

  if (!course_id || !cid) {
    return cResp(null, '缺少 course_id 或 cid 参数', false)
  }

  const result = await db.update(schema.comments).set({ status: 'published' }).where(and(
    eq(schema.comments.courseId, Number(course_id)),
    eq(schema.comments.cid, Number(cid))
  ))

  return cResp({ approved: true })
})