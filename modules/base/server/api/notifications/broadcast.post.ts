import { db, schema } from '@nuxthub/db'
import { isNull } from 'drizzle-orm'
import { broadcastToAll } from '../../utils/ws/state'

/**
 * 管理员向所有用户广播通知
 * POST /api/notifications/broadcast
 *   body: { title, content }
 *   content 支持：纯字符串，或富文本（UMO JSON doc，服务端提取纯文本存入 content.text）
 *
 * 实现：采用「对每个用户各插一条」的 fan-out —— 复用现有按 userId 的
 * 列表/未读/已读逻辑（list/unread/markRead 无需改动）。
 * 写库后通过 broadcastToAll 广播 type='notify'，在线客户端刷新未读角标。
 */
function toText(content: any): string {
  if (!content) return ''
  if (typeof content === 'string') return content
  if (Array.isArray(content)) return content.map(toText).join('')
  if (typeof content.text === 'string') return content.text
  if (Array.isArray(content.content)) return content.content.map(toText).join('')
  return ''
}

export default eventHandler(async (event) => {
  await requireRole(event, ['admin'])

  const body = await readBody(event)
  const title = String(body.title || '').trim()
  const text = toText(body.content).trim()
  if (!title || !text) {
    return cResp(null, '缺少标题或内容', false)
  }

  // 所有有效用户（未软删除）
  const users = await db
    .select({ id: schema.users.id })
    .from(schema.users)
    .where(isNull(schema.users.deletedAt))
  if (users.length === 0) return cResp({ total: 0 })

  const content = { text: text.slice(0, 2000) }
  const rows = users.map((u) => ({
    userId: u.id,
    name: title,
    content,
    data: { type: 'broadcast' },
  }))

  await db.insert(schema.notifys).values(rows)

  // 实时推送给所有在线用户，刷新未读角标
  broadcastToAll({ type: 'notify' })

  return cResp({ total: users.length })
})