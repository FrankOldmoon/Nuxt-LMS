import { createHmac, timingSafeEqual } from 'node:crypto'
import { db, schema } from '@nuxthub/db'
import { eq } from 'drizzle-orm'
import { verifyPassword } from './auth/password'

// 启动访问门（StartupGate）：用真实用户账号/密码校验，不再使用硬编码密码。
// 校验通过后签发 HttpOnly cookie，凭签名判断已解锁（不代表已登录）。
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

/** 用真实账号密码校验访问门，等价于登录的开锁：通过后签发 startup cookie，返回校验通过的用户；否则 null */
export async function verifyStartupLogin(event: StartupEvent, username: string, password: string): Promise<any | null> {
  if (!username || !password) return null
  const users = await db
    .select()
    .from(schema.users)
    .where(eq(schema.users.username, username))
    .limit(1)
  if (users.length === 0) return null
  const user = users[0]
  const ok = await verifyPassword(password, user.password)
  if (!ok) return null
  const token = sign(String(Date.now()))
  setCookie(event, COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: Math.floor(TTL_MS / 1000),
    path: '/',
  })
  return user
}

/** 判断当前请求是否已通过启动校验（凭 HttpOnly cookie 的签名） */
export function isStartupUnlocked(event: StartupEvent): boolean {
  return verifyToken(getCookie(event, COOKIE_NAME))
}