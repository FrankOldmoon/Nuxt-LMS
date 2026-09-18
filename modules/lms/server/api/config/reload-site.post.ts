import { reloadConfig } from '../../../../base/server/utils/config/reload'
import { broadcastToAll } from '../../../../base/server/utils/ws/state'

/**
 * 刷新 site 配置内存缓存
 *
 * 历史问题：原实现调用 `reloadSiteConfig()`，但该函数在源码中并不存在（仅有测试桩），
 * 该端点一旦被调用就会 ReferenceError。现改为复用 base 的 reloadConfig，
 * 并广播 site-config-changed 通知本进程客户端刷新（其它进程由请求钩子按版本戳自动失效）。
 */
export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  await reloadConfig()
  broadcastToAll({ type: 'site-config-changed' })
  return cResp(null, 'site_config 已刷新')
})
