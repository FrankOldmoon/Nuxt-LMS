/**
 * 真实客户端 IP
 *
 * 为什么不直接用 getRequestIP(event)：生产是 nginx 反代到 3001-3008，
 * 不加 xForwardedFor 时 h3 只读 socket 地址，拿到的永远是 127.0.0.1。
 * 后果不只是审计记不到来源——登录限流按 IP 计数会退化成「全局限流」，
 * 一个人连点 5 次就把全校 429 掉。
 *
 * 取值顺序：
 *   1. X-Real-IP        —— nginx 用 $remote_addr 覆盖写，客户端无法伪造（首选）
 *   2. X-Forwarded-For  —— 取最后一段（最靠近我们的代理看到的对端）；最左段可被伪造，不用
 *   3. socket 地址      —— 直连端口 / 本地开发的兜底
 */
export function clientIp(event: any): string | null {
  try {
    const real = getHeader(event, 'x-real-ip')
    if (real) return String(real).split(',')[0]!.trim() || null

    const xff = getHeader(event, 'x-forwarded-for')
    if (xff) {
      const parts = String(xff).split(',').map((s) => s.trim()).filter(Boolean)
      if (parts.length) return parts[parts.length - 1]!
    }
  } catch {
    // header 读取失败时退回 socket 地址
  }
  return getRequestIP(event) || null
}
