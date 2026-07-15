import { db, schema } from "@nuxthub/db"
import { eq, and, or, desc, isNull } from "drizzle-orm"

/**
 * Get chat history with a specific user
 * query: userId
 */
export default eventHandler(async (event) => {
  const user = await requireAuth(event)
  const { userId } = getQuery(event)
  const otherUserId = Number(userId)
  if (!otherUserId) {
    return cResp(null, 'Missing userId parameter', false)
  }

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
          and(eq(schema.messages.senderUserId, user.id), eq(schema.messages.receiverUserId, otherUserId)),
          and(eq(schema.messages.senderUserId, otherUserId), eq(schema.messages.receiverUserId, user.id))
        ),
        isNull(schema.messages.deletedAt)
      )
    )
    .orderBy(desc(schema.messages.createdAt))

  // Mark received messages as read
  await db.update(schema.messages)
    .set({ readAt: new Date() })
    .where(
      and(
        eq(schema.messages.senderUserId, otherUserId),
        eq(schema.messages.receiverUserId, user.id),
        isNull(schema.messages.readAt)
      )
    )

  return cResp(msgs)
})
