/**
 * 删除会话（软删除）
 * POST /api/chat/conversation/delete  body: { id }
 */
import { db, schema } from '@nuxthub/db'
import { and, eq, isNull } from 'drizzle-orm'

export default eventHandler(async (event) => {
  const user = await requireAuth(event)
  const body = await readBody(event).catch(() => ({} as any))
  const id = Number(body?.id) || 0
  if (!id) return cResp(null, '缺少 id', false)

  const [row] = await db
    .update(schema.chatConversations)
    .set({ deletedAt: new Date() })
    .where(and(
      eq(schema.chatConversations.id, id),
      eq(schema.chatConversations.userId, user.id),
      isNull(schema.chatConversations.deletedAt),
    ))
    .returning({ id: schema.chatConversations.id })

  if (!row) return cResp(null, '会话不存在', false)
  return cResp({ id: row.id })
})
