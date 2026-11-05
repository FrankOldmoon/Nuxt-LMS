/**
 * 按分享令牌读取会话（只读）
 * GET /api/chat/share?token=xxx
 *
 * 必须登录才能看（避免链接被转发到站外），但不限于会话主人 ——
 * 拿链接的老师、同学都能读，这就是「学生主动分享」的语义。
 */
import { db, schema } from '@nuxthub/db'
import { asc, eq } from 'drizzle-orm'

export default eventHandler(async (event) => {
  await requireAuth(event)
  const token = String(getQuery(event).token || '').trim()
  if (!token) return cResp(null, '缺少 token', false)

  const [conv] = await db
    .select({
      id: schema.chatConversations.id,
      title: schema.chatConversations.title,
      sharedAt: schema.chatConversations.sharedAt,
      ownerId: schema.chatConversations.userId,
    })
    .from(schema.chatConversations)
    .where(eq(schema.chatConversations.shareToken, token))
    .limit(1)
  if (!conv) return cResp(null, '链接已失效或被取消分享', false)

  const rows = await db
    .select({
      id: schema.chatMessages.id,
      role: schema.chatMessages.role,
      content: schema.chatMessages.content,
      reasoning: schema.chatMessages.reasoning,
      createdAt: schema.chatMessages.createdAt,
    })
    .from(schema.chatMessages)
    .where(eq(schema.chatMessages.conversationId, conv.id))
    .orderBy(asc(schema.chatMessages.id))

  // system 是内部事件（作答结果、学情摘要），不给外部看
  const messages = rows.filter((m) => m.role !== 'system')

  return cResp({
    conversation: { id: conv.id, title: conv.title, sharedAt: conv.sharedAt },
    messages,
  })
})
