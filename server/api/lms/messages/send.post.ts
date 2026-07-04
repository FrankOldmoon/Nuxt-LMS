import { db, schema } from "@nuxthub/db"
import { eq } from "drizzle-orm"
import { sendToUser } from "../../../utils/wsRooms"

/**
 * 发送消息
 * body: { receiverUserId, content }
 * 保存后通过 WebSocket 实时推送给接收者
 */
export default eventHandler(async (event) => {
  const user = await requireAuth(event)

  const body = await readBody(event)
  const { receiverUserId, content } = body

  if (!receiverUserId || !content) {
    return cResp(null, '缺少参数', false)
  }

  // 查询接收者名字
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

  // 通过 WebSocket 推送给接收者（在线则实时收到）
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
