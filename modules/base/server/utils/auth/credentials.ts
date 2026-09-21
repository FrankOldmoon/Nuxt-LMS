import { db, schema } from '@nuxthub/db'
import { eq } from 'drizzle-orm'
import { verifyPassword } from './password'

/**
 * 凭据校验结果：
 * - ok=true  → 校验通过，返回用户
 * - ok=false → 校验失败；forbidden=true 表示凭据正确但被站点策略拒绝（如非 IP 域名仅允许教师及以上）
 */
export type CredentialResult =
  | { ok: true; user: any }
  | { ok: false; forbidden?: boolean }

/**
 * 校验账号密码。login 与 startup 访问门共用同一实现。
 *
 * 注意：已按产品要求移除「多次登录失败后锁定账号」的防护逻辑
 * （含 failedAttempts 计数与指数退避锁定）。IP 层面的限流由 rate-limit 中间件负责。
 */
export async function verifyCredentials(username: string, password: string): Promise<CredentialResult> {
  const rows = await db
    .select()
    .from(schema.users)
    .where(eq(schema.users.username, username))
    .limit(1)

  if (rows.length === 0) return { ok: false }

  const user = rows[0]
  const valid = await verifyPassword(password, user.password)
  if (!valid) return { ok: false }

  return { ok: true, user }
}
