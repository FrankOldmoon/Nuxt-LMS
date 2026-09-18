import { createHmac, timingSafeEqual } from 'node:crypto'
import { verifyCredentials, type CredentialResult } from './auth/credentials'

// 启动访问门（StartupGate）：用真实用户账号/密码校验，不再使用硬编码密码。
// 校验通过后签发 HttpOnly cookie，凭签名判断已解锁（不代表已登录）。
// HMAC 签名密钥：生产环境必须显式配置 NUXT_STARTUP_SECRET，禁止使用仓库内公开的默认值
// （否则任何人可用默认密钥伪造 startup_token 解锁访问门）。开发环境未配置时回退默认密钥并告警。
const DEV_FALLBACK_SECRET = 'lms-startup-secret'
const COOKIE_NAME = 'startup_token'
const TTL_MS = 1000 * 60 * 60 * 24 * 7 // 7 天

type StartupEvent = Parameters<typeof getCookie>[0]

/**
 * 解析 HMAC 签名密钥。
 * 生产环境未配置 NUXT_STARTUP_SECRET 时抛 500，拒绝签发/校验，避免使用已知默认密钥。
 */
let warnedMissingSecret = false
function resolveSecret(): string {
  const configured = process.env.NUXT_STARTUP_SECRET
  if (configured) return configured
  if (process.env.NODE_ENV === 'production') {
    throw createError({
      statusCode: 500,
      message: 'NUXT_STARTUP_SECRET 未配置：生产环境必须显式设置该环境变量才能签发/校验 startup token',
    })
  }
  if (!warnedMissingSecret) {
    warnedMissingSecret = true
    console.warn('[startup] NUXT_STARTUP_SECRET 未配置，开发环境回退到默认密钥；生产环境必须显式配置。')
  }
  return DEV_FALLBACK_SECRET
}

function sign(payload: string): string {
  const mac = createHmac('sha256', resolveSecret()).update(payload).digest('base64url')
  return `${payload}.${mac}`
}

function verifyToken(token: string | undefined): boolean {
  if (!token) return false
  const [payload, mac] = token.split('.')
  if (!payload || !mac) return false
  const expected = createHmac('sha256', resolveSecret()).update(payload).digest('base64url')
  if (expected.length !== mac.length || expected.length === 0) return false
  if (!timingSafeEqual(Buffer.from(expected), Buffer.from(mac))) return false
  const ts = Number(payload)
  if (!Number.isFinite(ts)) return false
  return Date.now() - ts < TTL_MS
}

/**
 * 用真实账号密码校验访问门，等价于登录的开锁：通过后签发 startup cookie。
 * 凭据校验与暴力破解防护（失败计数 / 指数退避锁定）复用 login 的同一实现，
 * 使访问门不再成为绕过账号锁定保护的旁路（IP 限流由 rate-limit 中间件覆盖）。
 */
export async function verifyStartupLogin(event: StartupEvent, username: string, password: string): Promise<CredentialResult> {
  if (!username || !password) return { ok: false, locked: false }
  // 先校验签名密钥：生产环境缺失时快速失败，避免在无有效密钥时消耗凭据校验/失败计数
  resolveSecret()
  const result = await verifyCredentials(username, password)
  if (!result.ok) return result
  const token = sign(String(Date.now()))
  setCookie(event, COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: Math.floor(TTL_MS / 1000),
    path: '/',
  })
  return { ok: true, user: result.user }
}

/** 判断当前请求是否已通过启动校验（凭 HttpOnly cookie 的签名） */
export function isStartupUnlocked(event: StartupEvent): boolean {
  return verifyToken(getCookie(event, COOKIE_NAME))
}