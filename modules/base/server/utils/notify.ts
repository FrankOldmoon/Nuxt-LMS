import { db, schema } from '@nuxthub/db'
import { sendToUser } from './ws/state'

/** 富文本 / 字符串 → 纯文本（与广播一致，可提取 UMO JSON doc 的文本） */
export function notifyText(content: any): string {
  if (!content) return ''
  if (typeof content === 'string') return content
  if (Array.isArray(content)) return content.map(notifyText).join('')
  if (typeof content.text === 'string') return content.text
  if (Array.isArray(content.content)) return content.content.map(notifyText).join('')
  return ''
}

/**
 * 给单个用户发送定向通知（两层方案里的「个人通知」）
 *
 * - `broadcastId` 为 null：用户读后由 /api/notifications/list 直接硬删除（不保留、不统计）
 * - `data.type` 供前端本地化渲染（服务端只存中文兜底文案，保证任意客户端都能显示）
 *
 * 调用方应自行 try/catch（通知失败不应影响主业务，如打分 / 审核）。
 */
export async function notifyUser(
  userId: number,
  title: string,
  content: any,
  data?: Record<string, any>,
): Promise<void> {
  if (!userId || !title) return
  const text = notifyText(content).trim()
  if (!text) return

  await db.insert(schema.notifys).values({
    userId,
    name: title.slice(0, 255),
    content: { text: text.slice(0, 2000) },
    data: data ?? null,
  })

  // 实时刷新该用户的未读角标
  sendToUser(userId, { type: 'notify' })
}
