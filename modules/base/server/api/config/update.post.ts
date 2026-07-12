import { reloadConfig } from '../../utils/config/reload'
import { broadcastToAll } from '../../utils/ws/state'

/**
 * 管理员：更新单个 site:* 配置键
 */
export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  const body = await readBody(event)
  const { key, value } = body || {}
  if (!key || typeof key !== 'string' || !key.startsWith('site:')) {
    return cResp(null, '无效的 key', false)
  }
  await upsertConfig(key, value)
  await reloadConfig()
  // 通知所有在线客户端：站点配置已变更，useSiteConfig 会自动 refresh
  broadcastToAll({ type: 'site-config-changed' })
  return cResp(null, '更新成功')
})
