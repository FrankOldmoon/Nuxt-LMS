import { db, schema } from '@nuxthub/db'
import { isNull } from 'drizzle-orm'
import { broadcastToAll } from '../../utils/ws/state'
import { notifyText } from '../../utils/notify'

/**
 * 管理员向所有用户广播通知（两层方案）
 * POST /api/notifications/broadcast
 *   body: { title, content }
 *   content 支持：纯字符串，或富文本（UMO JSON doc，服务端提取纯文本存入 content.text）
 *
 * 两层结构：
 * 1. `broadcasts` 主表：1 行，存内容 / 发送者 / 送达人数快照 → 管理员据此统计阅读率
 * 2. `notifications` 明细：每人 1 行，带 `broadcastId` 与各自的 `readAt`
 *
 * 明细读后只写 `readAt`（不删除），以便 /api/admin/broadcasts 统计已读率。
 * 写库后通过 broadcastToAll 广播 type='notify'，在线客户端刷新未读角标。
 */
export default eventHandler(async (event) => {
  const admin = await requireRole(event, ['admin'])

  const body = await readBody(event)
  const title = String(body.title || '').trim()
  const text = notifyText(body.content).trim()
  if (!title || !text) {
    return cResp(null, '缺少标题或内容', false)
  }

  // 所有有效用户（未软删除）
  const users = await db
    .select({ id: schema.users.id })
    .from(schema.users)
    .where(isNull(schema.users.deletedAt))
  if (users.length === 0) return cResp({ total: 0, broadcastId: null })

  const content = { text: text.slice(0, 2000) }

  // 第一层：广播主表
  const inserted = await db
    .insert(schema.broadcasts)
    .values({
      name: title,
      content,
      createdBy: admin?.id ?? null,
      audience: users.length,
    })
    .returning()
  const broadcastId = Number(inserted[0]?.id) || null

  // 第二层：每人一条明细
  const rows = users.map((u) => ({
    userId: u.id,
    name: title,
    content,
    data: { type: 'broadcast', broadcastId },
    broadcastId,
  }))
  await db.insert(schema.notifys).values(rows)

  // 实时推送给所有在线用户，刷新未读角标
  broadcastToAll({ type: 'notify' })

  return cResp({ total: users.length, broadcastId })
})
