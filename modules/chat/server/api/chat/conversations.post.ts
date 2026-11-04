/**
 * 新建会话
 * POST /api/chat/conversations
 * body: { title?, model? }
 */
import { db, schema } from '@nuxthub/db'

export default eventHandler(async (event) => {
  const user = await requireAuth(event)
  const body = await readBody(event).catch(() => ({} as any))

  const title = typeof body?.title === 'string' && body.title.trim()
    ? body.title.trim().slice(0, 100)
    : 'New chat'
  const model = typeof body?.model === 'string' && body.model.trim()
    ? body.model.trim().slice(0, 100)
    : null

  const [row] = await db
    .insert(schema.chatConversations)
    .values({ userId: user.id, title, model })
    .returning()

  return cResp(row)
})
