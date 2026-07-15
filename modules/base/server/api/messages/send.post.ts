import { db, schema } from "@nuxthub/db"
import { eq } from "drizzle-orm"

/**
 * Send message
 * body: { receiverUserId, content }
 * After saving, push to receiver in real-time via WebSocket
 */
export default eventHandler(async (event) => {
  const user = await requireAuth(event)

  const body = await readBody(event)
  const { receiverUserId, content } = body

  if (!receiverUserId || !content) {
    return cResp(null, 'Missing parameters', false)
  }

  // Query receiver name
  const receiver = await db
    .select({ name: schema.users.name })
    .from(schema.users)
    .where(eq(schema.users.id, Number(receiverUserId)))
    .limit(1)

  const result = await db.insert(schema.messages).values({
    name: receiver[0]?.name || 'message',
    content: typeof content === 'string' ? { text: content } : content,
    senderUserId: user.id,
    receiverUserId: Number(receiverUserId),
  }).returning()

  const msg = result[0]

  // Push to receiver via WebSocket (received in real-time if online)
  if (msg) {
    sendToUser(Number(receiverUserId), {
      type: 'message',
      message: {
        id: msg.id,
        name: msg.name,
        content: msg.content,
        senderUserId: msg.senderUserId,
        receiverUserId: msg.receiverUserId,
        readAt: msg.readAt,
        createdAt: msg.createdAt,
      },
    })
  }

  return cResp(msg)
})
