import { db, schema } from "@nuxthub/db"
import { eq } from "drizzle-orm"

/**
 * 发送消息
 * body: { receiverUserId, content }
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

  return cResp(result[0])
})
