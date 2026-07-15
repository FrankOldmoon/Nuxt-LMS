import { db, schema } from "@nuxthub/db"
import { eq, and, or, desc, isNull } from "drizzle-orm"

/**
 * Get current user's message conversation list (recently chatted users)
 * Returns [{ userId, name, avatarImg, lastMessage, lastTime, unreadCount }]
 */
export default eventHandler(async (event) => {
  const user = await requireAuth(event)

  // Query all messages related to the current user
  const msgs = await db
    .select({
      id: schema.messages.id,
      name: schema.messages.name,
      content: schema.messages.content,
      senderUserId: schema.messages.senderUserId,
      receiverUserId: schema.messages.receiverUserId,
      readAt: schema.messages.readAt,
      createdAt: schema.messages.createdAt,
    })
    .from(schema.messages)
    .where(
      and(
        or(
          eq(schema.messages.senderUserId, user.id),
          eq(schema.messages.receiverUserId, user.id)
        ),
        isNull(schema.messages.deletedAt)
      )
    )
    .orderBy(desc(schema.messages.createdAt))

  // Group by conversation counterpart
  const conversations = new Map<number, { userId: number, name: string, avatarImg: string | null, lastMessage: any, lastTime: string, unreadCount: number }>()
  for (const m of msgs) {
    const otherUserId = m.senderUserId === user.id ? m.receiverUserId : m.senderUserId
    if (!conversations.has(otherUserId)) {
      conversations.set(otherUserId, {
        userId: otherUserId,
        name: m.name,
        avatarImg: null,
        lastMessage: m.content,
        lastTime: m.createdAt,
        unreadCount: 0,
      })
    }
    const conv = conversations.get(otherUserId)!
    // Unread count (received and unread)
    if (m.receiverUserId === user.id && !m.readAt) {
      conv.unreadCount++
    }
  }

  // Query user info
  const userIds = [...conversations.keys()]
  if (userIds.length > 0) {
    const users = await db
      .select({ id: schema.users.id, name: schema.users.name, avatarImg: schema.users.avatarImg })
      .from(schema.users)
      .where(or(...userIds.map(id => eq(schema.users.id, id))))
    const userMap = new Map(users.map(u => [u.id, u]))
    for (const conv of conversations.values()) {
      const u = userMap.get(conv.userId)
      if (u) {
        conv.name = u.name
        conv.avatarImg = u.avatarImg
      }
    }
  }

  return cResp([...conversations.values()].sort((a, b) => new Date(b.lastTime).getTime() - new Date(a.lastTime).getTime()))
})
