/**
 * 认证接口 IP 速率限制中间件
 *
 * 针对登录/重置密码等敏感端点按 IP 限流，防止分布式暴力破解与邮件轰炸。
 * 采用滑动窗口算法，单实例内存存储（重启清空，符合 LMS 单实例部署场景）。
 *
 * 限制：每 IP 每分钟最多 RATE_LIMIT_MAX 次请求（默认 10）。
 * 超限返回 429 Too Many Requests。
 */

const WINDOW_MS = 60_000 // 1 分钟窗口
const RATE_LIMIT_MAX = 10 // 每 IP 每窗口最大请求数

// 受保护的端点（认证相关，易遭暴力破解/枚举）
const PROTECTED_PATHS = new Set([
  '/api/auth/login',
  '/api/auth/forgot-password',
  '/api/auth/reset-password',
])

// IP → 窗口内请求时间戳列表
const ipHits = new Map<string, number[]>()

export default defineEventHandler(async (event) => {
  const path = getRequestPath(event)
  if (!PROTECTED_PATHS.has(path)) return

  const ip = getRequestIP(event) || 'unknown'
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
