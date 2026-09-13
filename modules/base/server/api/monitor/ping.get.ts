/**
 * 轻量健康检查：供监控页探测各端口实例是否在线（无需登录）
 */
export default defineEventHandler(() => {
  return cResp({ ok: true, time: Date.now() })
})
