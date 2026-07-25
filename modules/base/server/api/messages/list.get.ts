import { db, schema } from "@nuxthub/db"
import { eq, and, or, desc, isNull } from "drizzle-orm"

/**
 * 获取与某用户的聊天记录
 * query: userId
 */
export default eventHandler(async (event) => {
  const user = await requireAuth(event)
  const { userId } = getQuery(event)
  const otherUserId = Number(userId)
  if (!otherUserId) {
    return cResp(null, '缺少 userId 参数', false)
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

  // 标记收到的消息为已读
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
