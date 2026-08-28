import { createHmac, timingSafeEqual } from 'node:crypto'

// 全局启动访问密码（默认 Minxin1314，可通过环境变量覆盖）
const STARTUP_PASSWORD = process.env.NUXT_STARTUP_PASSWORD || 'Minxin1314'
// HMAC 签名密钥（生产环境建议通过 NUXT_STARTUP_SECRET 覆盖）
const SECRET = process.env.NUXT_STARTUP_SECRET || 'lms-startup-secret'
const COOKIE_NAME = 'startup_token'
const TTL_MS = 1000 * 60 * 60 * 24 * 7 // 7 天

type StartupEvent = Parameters<typeof getCookie>[0]

function sign(payload: string): string {
  const mac = createHmac('sha256', SECRET).update(payload).digest('base64url')
  return `${payload}.${mac}`
}

function verifyToken(token: string | undefined): boolean {
  if (!token) return false
  const [payload, mac] = token.split('.')
  if (!payload || !mac) return false
  const expected = createHmac('sha256', SECRET).update(payload).digest('base64url')
  if (expected.length !== mac.length || expected.length === 0) return false
  if (!timingSafeEqual(Buffer.from(expected), Buffer.from(mac))) return false
  const ts = Number(payload)
  if (!Number.isFinite(ts)) return false
  return Date.now() - ts < TTL_MS
}

/** 校验密码并签发 HttpOnly cookie（返回是否成功） */
export function verifyStartupPassword(event: StartupEvent, password: string): boolean {
  if (password !== STARTUP_PASSWORD) return false
  const token = sign(String(Date.now()))
  setCookie(event, COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: Math.floor(TTL_MS / 1000),
    path: '/',
  })
  return true
}

/** 判断当前请求是否已通过启动校验（凭 HttpOnly cookie 的签名） */
export function isStartupUnlocked(event: StartupEvent): boolean {
  return verifyToken(getCookie(event, COOKIE_NAME))
}