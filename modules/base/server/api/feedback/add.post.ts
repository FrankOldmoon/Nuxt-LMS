import { db, schema } from "@nuxthub/db"

/**
 * 提交用户反馈
 * POST /api/feedback/add
 * body: { name, type, content }
 *  - name: 反馈标题
 *  - type: bug | suggestion | requirement
 *  - content: 富文本内容（ueditor 生成的文档，可为对象或字符串）
 *
 * 权限：登录用户
 */
export default eventHandler(async (event) => {
  const user = await requireAuth(event)

  const body = await readBody(event)
  const name = String(body?.name || '').trim()
  const type = String(body?.type || 'suggestion').trim()
  const validTypes = ['bug', 'suggestion', 'requirement']
  const content = body?.content ?? null

  if (!name) {
    return cResp(null, '缺少标题', false)
  }
  if (!validTypes.includes(type)) {
    return cResp(null, '无效的反馈类型', false)
  }

  const rows = await db.insert(schema.feedbacks).values({
    name,
    type,
    content: typeof content === 'string' ? { text: content } : content,
    userId: user.id,
  }).returning()

  return cResp(rows[0])
})