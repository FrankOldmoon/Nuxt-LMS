/**
 * 追加消息
 * POST /api/chat/messages
 * body: { conversation_id, messages: [{ role, content, reasoning?, model? }], title? }
 *
 * 用于一问一答落库：前端在收到 user-message 与流式结束时各调一次。
 * 若会话标题仍是默认的 "New chat"，用首条 user 消息前 40 字自动命名。
 */
import { db, schema } from '@nuxthub/db'
import { and, eq, isNull, sql } from 'drizzle-orm'

const DEFAULT_TITLE = 'New chat'

export default eventHandler(async (event) => {
  const user = await requireAuth(event)
  const body = await readBody(event).catch(() => ({} as any))

  const convId = Number(body?.conversation_id) || 0
  const list = Array.isArray(body?.messages) ? body.messages : []
  if (!convId) return cResp(null, '缺少 conversation_id', false)
  if (!list.length) return cResp(null, 'messages 不能为空', false)

  // 归属校验
  const [conv] = await db
    .select()
    .from(schema.chatConversations)
    .where(and(
      eq(schema.chatConversations.id, convId),
      eq(schema.chatConversations.userId, user.id),
      isNull(schema.chatConversations.deletedAt),
    ))
    .limit(1)
  if (!conv) return cResp(null, '会话不存在', false)

  const rows = list
    .filter((m: any) => m && typeof m === 'object')
    .map((m: any) => ({
      conversationId: convId,
      role: ['user', 'assistant', 'system', 'tool'].includes(m.role) ? m.role : 'user',
      content: typeof m.content === 'string' ? m.content.slice(0, 200_000) : String(m.content ?? ''),
      reasoning: typeof m.reasoning === 'string' ? m.reasoning.slice(0, 200_000) : null,
      toolCalls: typeof m.toolCalls === 'string' ? m.toolCalls.slice(0, 200_000) : null,
      model: typeof m.model === 'string' ? m.model.slice(0, 100) : null,
    }))
  if (!rows.length) return cResp(null, 'messages 不能为空', false)

  const inserted = await db.insert(schema.chatMessages).values(rows).returning()

  // 标题自动生成：仅在仍是默认标题（或为空）且本次带 user 消息时
  const firstUser = rows.find((r: any) => r.role === 'user')
  let title = conv.title
  const titleFromBody = typeof body?.title === 'string' ? body.title.trim().slice(0, 100) : ''
  if (titleFromBody) {
    title = titleFromBody
  } else if ((!title || title === DEFAULT_TITLE) && firstUser) {
    const raw = firstUser.content.replace(/```[\s\S]*?```/g, ' ').replace(/\s+/g, ' ').trim()
    if (raw) title = raw.slice(0, 40)
  }

  await db
    .update(schema.chatConversations)
    .set({
      title,
      lastMessageAt: new Date(),
      messageCount: sql`${schema.chatConversations.messageCount} + ${rows.length}`,
    })
    .where(eq(schema.chatConversations.id, convId))

  return cResp({ inserted: inserted.length, title })
})
