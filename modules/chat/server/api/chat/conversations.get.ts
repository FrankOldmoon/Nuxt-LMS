/**
 * 会话列表
 * GET /api/chat/conversations
 *
 * 返回当前用户未删除的会话，按「置顶 → 最近消息时间」倒序。
 */
import { db, schema } from '@nuxthub/db'
import { and, eq, isNull, desc } from 'drizzle-orm'

export default eventHandler(async (event) => {
  const user = await requireAuth(event)

  const rows = await db
    .select({
      id: schema.chatConversations.id,
      title: schema.chatConversations.title,
      model: schema.chatConversations.model,
      pinned: schema.chatConversations.pinned,
      messageCount: schema.chatConversations.messageCount,
      lastMessageAt: schema.chatConversations.lastMessageAt,
      createdAt: schema.chatConversations.createdAt,
    })
    .from(schema.chatConversations)
    .where(and(
      eq(schema.chatConversations.userId, user.id),
      isNull(schema.chatConversations.deletedAt),
    ))
    .orderBy(desc(schema.chatConversations.pinned), desc(schema.chatConversations.lastMessageAt))

  return cResp(rows)
})
