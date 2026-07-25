import { reloadConfig } from '../../utils/config/reload'
import { broadcastToAll } from '../../utils/ws/state'

/**
 * 管理员：重新从数据库加载配置到内存缓存（替代原 /api/reload-site）
 */
export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  await reloadConfig()
  // 通知所有在线客户端：站点配置已变更，useSiteConfig 会自动 refresh
  broadcastToAll({ type: 'site-config-changed' })
  return cResp(null, '已重载')
})
