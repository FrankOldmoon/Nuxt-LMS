import { db, schema } from "@nuxthub/db"
import { eq, and } from "drizzle-orm"
import { validateCommentContent, isCommentEmpty } from "../../utils/comment/validate"

export default eventHandler(async (event) => {
  await requireRole(event, ['teacher', 'admin'])

  const body = await readBody(event)
  const { course_id, id } = body

  if (!course_id || !id) {
    return cResp(null, '缺少 id 参数', false)
  }

  // 字段白名单：仅允许更新评论内容相关字段，防止 mass assignment 改写 userId/status 等
  const allowedFields = ['name', 'code', 'content', 'tags', 'point']
  const updateData: Record<string, any> = {}
  for (const field of allowedFields) {
    if (body[field] !== undefined) {
      updateData[field] = body[field]
    }
  }
  if (Object.keys(updateData).length === 0) {
    return cResp(null, '没有需要更新的字段', false)
  }

  // H3：富文本内容安全校验（禁止 iframe/script 等危险节点）
  if (updateData.content !== undefined) {
    // 不允许把评论内容清空
    if (isCommentEmpty(updateData.content)) {
      return cResp(null, '评论内容不能为空', false)
    }
    const contentError = validateCommentContent(updateData.content)
    if (contentError) {
      return cResp(null, contentError, false)
    }
  }

  try {
    const result = await db.update(schema.comments).set(updateData).where(and(
      eq(schema.comments.courseId, course_id),
      eq(schema.comments.cid, id)
    ))
    return cResp(result)
  } catch (error: any) {
    console.error('更新评论失败:', error)
    return cResp(null, error.message || '更新失败', false)
  }
})
