/**
 * 认证接口 IP 速率限制中间件
 *
 * 针对登录/重置密码/访问门等敏感端点按 IP 限流，防止分布式暴力破解与邮件轰炸。
 * 采用滑动窗口算法，单实例内存存储（重启清空，符合 LMS 单实例部署场景）。
 *
 * 限制：每 IP 每分钟最多 RATE_LIMIT_MAX 次请求（默认 5，M6 加固：降低阈值以遏制暴力爆破）。
 * 超限返回 429 Too Many Requests。
 */

const WINDOW_MS = 60_000 // 1 分钟窗口
const RATE_LIMIT_MAX = 5 // 每 IP 每窗口最大请求数

// 受保护的端点（认证相关，易遭暴力破解/枚举）→ 生效方法
// 注：/api/auth/startup 访问门同样以真实账号密码开锁，必须纳入限流，
// 否则会成为绕过登录侧暴力破解防护的旁路；GET 仅查询解锁状态，不参与限流。
const PROTECTED_ENDPOINTS: Record<string, string[]> = {
  '/api/auth/login': ['POST'],
  '/api/auth/forgot-password': ['POST'],
  '/api/auth/reset-password': ['POST'],
  '/api/auth/startup': ['POST'],
}

// IP → 窗口内请求时间戳列表
const ipHits = new Map<string, number[]>()

export default defineEventHandler(async (event) => {
  const path = getRequestPath(event)
  const allowedMethods = PROTECTED_ENDPOINTS[path]
  if (!allowedMethods || !allowedMethods.includes(getMethod(event))) return

  // 必须用真实客户端 IP：反代后 getRequestIP 恒为 127.0.0.1，
  // 会让限流退化成全局限流（一个人就能把全校 429 掉）
  const ip = clientIp(event) || 'unknown'
  const now = Date.now()

  // 清理过期时间戳，仅保留窗口内的
  const hits = (ipHits.get(ip) || []).filter((t) => t > now - WINDOW_MS)
  hits.push(now)
  ipHits.set(ip, hits)

  if (hits.length > RATE_LIMIT_MAX) {
    throw createError({
      statusCode: 429,
      statusMessage: 'Too Many Requests',
      message: '请求过于频繁，请稍后再试',
    })
  }
})
