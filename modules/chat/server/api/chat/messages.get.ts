/**
 * 会话消息列表
 * GET /api/chat/messages?id=<conversationId>
 */
import { db, schema } from '@nuxthub/db'
import { and, eq, isNull, asc } from 'drizzle-orm'

export default eventHandler(async (event) => {
  const user = await requireAuth(event)
  const q = getQuery(event)
  const id = Number(q.id || q.conversation_id) || 0
  if (!id) return cResp(null, '缺少 id', false)

  // 归属校验：必须是自己未删除的会话
  const [conv] = await db
    .select({ id: schema.chatConversations.id })
    .from(schema.chatConversations)
    .where(and(
      eq(schema.chatConversations.id, id),
      eq(schema.chatConversations.userId, user.id),
      isNull(schema.chatConversations.deletedAt),
    ))
    .limit(1)
  if (!conv) return cResp(null, '会话不存在', false)

  const rows = await db
    .select()
    .from(schema.chatMessages)
    .where(eq(schema.chatMessages.conversationId, id))
    .orderBy(asc(schema.chatMessages.id))

  return cResp(rows)
})
