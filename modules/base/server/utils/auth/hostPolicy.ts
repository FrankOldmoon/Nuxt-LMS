/**
 * 访问来源策略：**非 IP 的 URL（正式域名）** 上的「访问门 / 登录」仅允许教师及以上角色通过。
 *
 * 背景：StartupGate 只在 NUXT_VERIFICATION_URL 指定的域名上出现；IP / localhost 等其它访问直接放行，
 * 便于本地开发。这里补一道服务端校验，避免通过域名访问时学生账号（即使知道密码）也能进：
 * 非 IP 的 URL 下只放行 admin / teacher / observer，/api/auth/startup（访问门）与
 * /api/auth/login（登录）都走同一判定，防止绕过访问门直接调登录接口。
 *
 * 豁免：IP 字面量（IPv4 / IPv6）与 localhost —— 本地开发需要登录学生账号调试。
 */
import { db, schema } from '@nuxthub/db'
import { eq } from 'drizzle-orm'

/** 允许通过「非 IP 域名」访问门 / 登录的角色（教师及以上，与 useAuth.canViewAvatars 同口径） */
export const GATE_LOGIN_ROLES = ['admin', 'teacher', 'observer'] as const

/** 取请求 Host 的主机名（去端口；IPv6 去方括号） */
export function requestHostname(event: any): string {
  const raw = String(getRequestHeader(event, 'host') || '').trim()
  if (!raw) return ''
  if (raw.startsWith('[')) {
    const end = raw.indexOf(']')
    return (end > 0 ? raw.slice(1, end) : raw.slice(1)).toLowerCase()
  }
  return raw.split(':')[0].toLowerCase()
}

/** 是否 IP 字面量（IPv4 / IPv6） */
export function isIpLiteral(host: string): boolean {
  if (!host) return false
  if (/^\d{1,3}(\.\d{1,3}){3}$/.test(host)) return true
  return host.includes(':') // IPv6（已去掉方括号）
}

/** 当前请求是否来自「非 IP 的 URL」（正式域名）—— 需要教师及以上才能通过访问门 / 登录 */
export function isNonIpHostUrl(event: any): boolean {
  const h = requestHostname(event)
  if (!h) return false
  if (isIpLiteral(h)) return false
  if (h === 'localhost') return false
  return true
}

/** 取用户角色 code 列表 */
export async function getUserRoleCodes(userId: number): Promise<string[]> {
  const rows: Array<{ code: string }> = await db
    .select({ code: schema.roles.code })
    .from(schema.userRoles)
    .innerJoin(schema.roles, eq(schema.userRoles.roleId, schema.roles.id))
    .where(eq(schema.userRoles.userId, userId))
  return (rows || []).map((r) => r.code)
}

/** 该用户是否允许在「非 IP 域名」上通过访问门 / 登录 */
export async function canPassGatedLogin(userId: number): Promise<boolean> {
  const codes = await getUserRoleCodes(userId)
  return codes.some((c) => (GATE_LOGIN_ROLES as readonly string[]).includes(c))
}

/**
 * 访问门 / 登录接口共用的放行判定。
 * @returns 允许则返回 true；不允许时返回 false（调用方负责返回提示）
 */
export async function isGatedLoginAllowed(event: any, userId: number): Promise<boolean> {
  if (!isNonIpHostUrl(event)) return true
  return canPassGatedLogin(userId)
}
