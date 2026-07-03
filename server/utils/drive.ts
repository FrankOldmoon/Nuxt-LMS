import { db, schema } from '@nuxthub/db'
import { eq, isNull, and, sum } from 'drizzle-orm'
import { getLmsConfig } from './lmsConfig'

const ADMIN = 'admin'
const TEACHER = 'teacher'

/**
 * 获取用户网盘配额上限（字节）。
 * - admin 不限，返回 Infinity
 * - teacher: driveSize * teacherMultiplier
 * - 其他: driveSize
 */
export async function getDriveQuota(user: { id: number; roles: string[] }): Promise<number> {
  if (user.roles.includes(ADMIN)) return Infinity

  const config = await getLmsConfig()
  const driveSize = Number(config?.storage?.driveSize) || 1073741824
  const multiplier = user.roles.includes(TEACHER)
    ? (Number(config?.storage?.teacherMultiplier) || 1)
    : 1
  return driveSize * multiplier
}

/**
 * 获取用户已用网盘空间（所有未删除文件 size 之和）
 */
export async function getDriveUsed(userId: number): Promise<number> {
  const rows = await db
    .select({ total: sum(schema.files.size) })
    .from(schema.files)
    .where(and(eq(schema.files.userId, userId), isNull(schema.files.deletedAt)))
  return Number(rows[0]?.total) || 0
}

/**
 * 检查上传指定大小的文件是否会超出配额。
 * 返回 { ok, quota, used, after }。
 */
export async function checkDriveSpace(
  user: { id: number; roles: string[] },
  addSize: number,
): Promise<{ ok: boolean; quota: number; used: number; after: number }> {
  const quota = await getDriveQuota(user)
  if (quota === Infinity) {
    return { ok: true, quota, used: 0, after: 0 }
  }
  const used = await getDriveUsed(user.id)
  const after = used + addSize
  return { ok: after <= quota, quota, used, after }
}
