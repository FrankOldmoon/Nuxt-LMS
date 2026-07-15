import { db, schema } from '@nuxthub/db'
import { eq, isNull, and, sum } from 'drizzle-orm'
import { getConfigSync } from './config/state'

const ADMIN = 'admin'
const TEACHER = 'teacher'

/**
 * Get user's drive quota limit (bytes).
 * - admin unlimited, returns Infinity
 * - teacher: driveQuota * teacherDriveMultiplier
 * - other: driveQuota
 */
export async function getDriveQuota(user: { id: number; roles: string[] }): Promise<number> {
  if (user.roles.includes(ADMIN)) return Infinity

  const driveQuota = Number(getConfigSync('site:driveQuota')) || 1073741824
  const multiplier = user.roles.includes(TEACHER)
    ? (Number(getConfigSync('site:teacherDriveMultiplier')) || 1)
    : 1
  return driveQuota * multiplier
}

/**
 * Get user's used drive space (sum of size of all non-deleted files)
 */
export async function getDriveUsed(userId: number): Promise<number> {
  const rows = await db
    .select({ total: sum(schema.files.size) })
    .from(schema.files)
    .where(and(eq(schema.files.userId, userId), isNull(schema.files.deletedAt)))
  return Number(rows[0]?.total) || 0
}

/**
 * Check whether uploading a file of the specified size would exceed the quota.
 * Returns { ok, quota, used, after }.
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
