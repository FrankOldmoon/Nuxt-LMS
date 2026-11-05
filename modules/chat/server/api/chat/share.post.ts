/**
 * 分享会话给老师（生成 / 取消只读链接）
 * POST /api/chat/share  body: { conversation_id, enable }
 *
 * 为什么是「学生主动分享」而不是老师全量可见：
 * 聊天记录里可能有学生问的私事，默认全开放不合适。
 * 学生点一下生成链接，老师凭链接看，范围可控。
 */
import { randomBytes } from 'node:crypto'
import { db, schema } from '@nuxthub/db'
import { and, eq, isNull } from 'drizzle-orm'

export default eventHandler(async (event) => {
  const user = await requireAuth(event)
  const body = await readBody(event).catch(() => ({} as any))
  const id = Number(body?.conversation_id) || 0
  const enable = body?.enable !== false
  if (!id) return cResp(null, '缺少 conversation_id', false)

  const [conv] = await db
    .select()
    .from(schema.chatConversations)
    .where(and(
      eq(schema.chatConversations.id, id),
      eq(schema.chatConversations.userId, user.id),
      isNull(schema.chatConversations.deletedAt),
    ))
    .limit(1)
  if (!conv) return cResp(null, '会话不存在', false)

  const token = enable
    ? (conv.shareToken || randomBytes(16).toString('hex'))
    : null

  await db
    .update(schema.chatConversations)
    .set({ shareToken: token, sharedAt: enable ? new Date() : null })
    .where(eq(schema.chatConversations.id, id))

  return cResp({
    token,
    url: token ? `/share/${token}` : null,
  })
})
