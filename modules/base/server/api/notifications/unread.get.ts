import { db, schema } from '@nuxthub/db'
import { eq, and, isNull, count } from 'drizzle-orm'

/**
 * 返回当前用户的未读通知 + 未读消息计数
 * 替代原对 /api/home 的依赖（base 独立运行时无 /api/home）
 */
export default eventHandler(async (event) => {
  const user = await requireAuth(event)

  const [notifyRow] = await db
    .select({ total: count() })
    .from(schema.notifys)
    .where(and(eq(schema.notifys.userId, user.id), isNull(schema.notifys.readAt)))

  const [msgRow] = await db
    .select({ total: count() })
    .from(schema.messages)
    .where(and(eq(schema.messages.receiverUserId, user.id), isNull(schema.messages.readAt)))

  return cResp({
    notifyUnread: Number(notifyRow?.total) || 0,
    msgUnread: Number(msgRow?.total) || 0,
  })
})
