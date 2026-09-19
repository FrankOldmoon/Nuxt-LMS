import { db, schema } from '@nuxthub/db'
import { eq } from 'drizzle-orm'
import { verifyPassword } from './password'

// ====================== 账号锁定指数退避（M6，内存单实例） ======================
// 每次触发锁定后，下次锁定时长按 base * 2^n 递增，封顶 MAX_LOCKOUT_MIN，遏制持续爆破。
const lockoutCounts = new Map<number, number>()
const MAX_LOCKOUT_MIN = 480 // 8 小时封顶

function nextLockoutMinutes(baseMinutes: number, userId: number): number {
  const count = lockoutCounts.get(userId) || 0
  lockoutCounts.set(userId, count + 1)
  return Math.min(baseMinutes * Math.pow(2, count), MAX_LOCKOUT_MIN)
}

function resetLockoutCount(userId: number) {
  lockoutCounts.delete(userId)
}
// ==============================================================================

/**
 * 凭据校验结果：
 * - ok=true  → 校验通过，返回用户
 * - ok=false → 校验失败；locked=true 表示账号处于锁定期内（remainingMinutes 为剩余分钟）；
 *              forbidden=true 表示凭据正确但被站点策略拒绝（如非 IP 域名仅允许教师及以上）
 */
export type CredentialResult =
  | { ok: true; user: any }
  | { ok: false; locked: true; remainingMinutes: number }
  | { ok: false; locked: false; forbidden?: boolean }

/**
 * 校验账号密码并施加暴力破解防护（失败计数 + 指数退避锁定）。
 *
 * login 与 startup 访问门共用同一实现，避免任一入口成为绕过账号锁定保护的旁路。
 * 读取 site:loginMaxAttempts / site:loginLockoutMinutes 配置（maxAttempts=0 表示不限制）。
 */
export async function verifyCredentials(username: string, password: string): Promise<CredentialResult> {
  const maxAttempts = Number(await getConfig('site:loginMaxAttempts')) || 0
  const lockoutMinutes = Number(await getConfig('site:loginLockoutMinutes')) || 15

  const users = await db
    .select()
    .from(schema.users)
    .where(eq(schema.users.username, username))
    .limit(1)

  if (users.length === 0) return { ok: false, locked: false }

  const user = users[0]

  // 检查账号锁定状态
  if (maxAttempts > 0 && user.lockedUntil) {
    const lockedUntilDate = new Date(user.lockedUntil)
    if (lockedUntilDate > new Date()) {
      const remainingMinutes = Math.ceil((lockedUntilDate.getTime() - Date.now()) / 60000)
      return { ok: false, locked: true, remainingMinutes }
    }
    // 锁定已过期，重置计数器
    await db.update(schema.users)
      .set({ failedAttempts: 0, lockedUntil: null })
      .where(eq(schema.users.id, user.id))
    user.failedAttempts = 0
    user.lockedUntil = null
  }

  // 验证密码
  const valid = await verifyPassword(password, user.password)
  if (!valid) {
    // 累加失败次数，达到阈值则锁定（锁定时间随次数指数退避）
    if (maxAttempts > 0) {
      const newAttempts = (Number(user.failedAttempts) || 0) + 1
      if (newAttempts >= maxAttempts) {
        const lockoutMin = nextLockoutMinutes(lockoutMinutes, user.id)
        await db.update(schema.users)
          .set({ failedAttempts: 0, lockedUntil: new Date(Date.now() + lockoutMin * 60000) })
          .where(eq(schema.users.id, user.id))
      } else {
        await db.update(schema.users)
          .set({ failedAttempts: newAttempts })
          .where(eq(schema.users.id, user.id))
      }
    }
    return { ok: false, locked: false }
  }

  // 校验成功：重置失败计数、锁定状态与退避计数
  if (maxAttempts > 0 && (user.failedAttempts || user.lockedUntil)) {
    await db.update(schema.users)
      .set({ failedAttempts: 0, lockedUntil: null })
      .where(eq(schema.users.id, user.id))
  }
  resetLockoutCount(user.id)

  return { ok: true, user }
}
