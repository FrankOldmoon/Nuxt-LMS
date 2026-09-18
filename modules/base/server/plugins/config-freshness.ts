/**
 * 配置新鲜度请求钩子（base）
 *
 * 生产为 nginx + 多进程（见 ecosystem.config.cjs），每个进程各有一份配置内存缓存。
 * 这里在每个请求入口做一次「版本戳」比对（modules/base/server/utils/config/version.ts）：
 * 版本戳变化 → 触发所有已注册的配置重载器（base 的 site + lms 注册的 lms）重新读库，
 * 从而保证任一进程在下一次请求时都能拿到 DB 最新的配置，读写一致。
 *
 * - 跳过静态资源请求，避免为 /_nuxt/*.js 等无谓地查库
 * - 钩子是 await 的，处理函数执行前缓存已刷新，因此 server 内部同步读缓存的
 *   调用点（getConfigSync / getLmsConfigSync）也是新鲜的
 */
import { reloadConfig } from '../utils/config/reload'
import { registerConfigReloader } from '../utils/hooks'
import { ensureConfigFresh } from '../utils/config/version'
import { broadcastToAll } from '../utils/ws/state'

/** 只对「API 与页面」请求做新鲜度检查，静态资源直接跳过 */
function shouldCheckFreshness(path: string): boolean {
  if (!path) return false
  // API 一律检查
  if (path.startsWith('/api/')) return true
  // 明显的静态/构建产物前缀
  if (path.startsWith('/_nuxt/') || path.startsWith('/_ipx/') || path.startsWith('/__nuxt')) return false
  // 带文件扩展名的（.js / .css / .png / .webp / .ico / .map ...）视为静态资源
  if (/\.[a-z0-9]{1,8}$/i.test(path)) return false
  return true
}

export default defineNitroPlugin((nitroApp) => {
  // site 配置重载器：重读 DB + 通知本进程客户端刷新（其它进程由各自请求钩子负责）
  registerConfigReloader(async () => {
    await reloadConfig()
    broadcastToAll({ type: 'site-config-changed' })
  })

  nitroApp.hooks.hook('request', async (event: any) => {
    const path: string = event?.path || event?.node?.req?.url || ''
    if (!shouldCheckFreshness(path)) return
    await ensureConfigFresh()
  })
})
