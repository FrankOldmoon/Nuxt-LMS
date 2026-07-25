import { reloadConfig } from '../../utils/config/reload'
import { broadcastToAll } from '../../utils/ws/state'

/**
 * 管理员：批量更新 site:* 配置键（供 settingsModal 保存）
 * body: { items: [{ key, value }] }
 */
export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  const body = await readBody(event)
  const items: { key: string; value: any }[] = body?.items || []
  if (!Array.isArray(items) || !items.length) {
    return cResp(null, 'items 不能为空', false)
  }
  for (const { key, value } of items) {
    if (key && typeof key === 'string' && key.startsWith('site:')) {
      await upsertConfig(key, value)
    }
  }
  await reloadConfig()
  // 通知所有在线客户端：站点配置已变更，useSiteConfig 会自动 refresh
  broadcastToAll({ type: 'site-config-changed' })
  return cResp(null, '保存成功')
})
