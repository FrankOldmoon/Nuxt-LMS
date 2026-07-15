import { db, schema } from '@nuxthub/db'
import { eq, and, isNull, count } from 'drizzle-orm'

/**
 * Return current user's unread notifications + unread message counts
 * Replaces the original dependency on /api/home (base has no /api/home when running independently)
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
