/**
 * 更新会话（重命名 / 置顶）
 * PATCH /api/chat/conversation
 * body: { id, title?, pinned? }
 */
import { db, schema } from '@nuxthub/db'
import { and, eq, isNull } from 'drizzle-orm'

export default eventHandler(async (event) => {
  const user = await requireAuth(event)
  const body = await readBody(event).catch(() => ({} as any))
  const id = Number(body?.id) || 0
  if (!id) return cResp(null, '缺少 id', false)

  const patch: Record<string, any> = {}
  if (typeof body?.title === 'string') {
    const t = body.title.trim().slice(0, 100)
    if (t) patch.title = t
  }
  if (typeof body?.pinned === 'boolean') patch.pinned = body.pinned
  if (!Object.keys(patch).length) return cResp(null, '没有需要更新的字段', false)

  const [row] = await db
    .update(schema.chatConversations)
    .set(patch)
    .where(and(
      eq(schema.chatConversations.id, id),
      eq(schema.chatConversations.userId, user.id),
      isNull(schema.chatConversations.deletedAt),
    ))
    .returning()

  if (!row) return cResp(null, '会话不存在', false)
  return cResp(row)
})
