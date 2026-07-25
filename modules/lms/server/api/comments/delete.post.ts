import { db, schema } from "@nuxthub/db"
import { eq, and } from "drizzle-orm"

export default eventHandler(async (event) => {
  const user = await requireAuth(event)

  const body = await readBody(event)
  const { course_id, cid } = body

  if (!course_id || !cid) {
    return cResp(null, '缺少参数', false)
  }

  const courseId = Number(course_id)
  const commentCid = Number(cid)

  // 查询评论，确认存在
  const existing = await db.query.comments.findFirst({
    where: and(
      eq(schema.comments.courseId, courseId),
      eq(schema.comments.cid, commentCid)
    )
  })

  if (!existing) {
    return cResp(null, '评论不存在', false)
  }

  // 权限：作者本人 或 教师/管理员
  const isOwner = existing.userId === user.id
  const isTeacher = user.roles?.some(r => ['teacher', 'admin'].includes(r))
  if (!isOwner && !isTeacher) {
    return cResp(null, '无权删除此评论', false)
  }

  try {
    await db.delete(schema.comments).where(and(
      eq(schema.comments.courseId, courseId),
      eq(schema.comments.cid, commentCid)
    ))
    return cResp({ deleted: true })
  } catch (error: any) {
    console.error('删除评论失败:', error)
    return cResp(null, error.message || '删除失败', false)
  }
})
