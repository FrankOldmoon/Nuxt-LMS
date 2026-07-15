/**
 * Goods management permission checks
 *
 * - admin: can manage all goods (including global courseId=0)
 * - teacher/editor: can only manage goods of their own courses (courseId > 0)
 * - global goods (courseId=0): only admin can manage
 */
import { db, schema } from '@nuxthub/db'
import { eq, and } from 'drizzle-orm'

/**
 * Check whether the user can manage goods of the specified course
 * admin always returns true; courseId=0 admin only; courseId>0 requires being the course teacher/editor
 */
export async function canManageGoods(user: { id: number; roles: string[] }, courseId: number): Promise<boolean> {
  if (user.roles.includes('admin')) return true
  if (courseId === 0) return false

  const rows = await db
    .select({ isTeacher: schema.userCourses.isTeacher, isEditor: schema.userCourses.isEditor })
    .from(schema.userCourses)
    .where(and(eq(schema.userCourses.userId, user.id), eq(schema.userCourses.courseId, courseId)))
    .limit(1)

  return rows.length > 0 && !!(rows[0].isTeacher || rows[0].isEditor)
}

/**
 * Check whether the user can manage an existing good
 * First query the good's courseId, then check permissions
 */
export async function canManageExistingGood(user: { id: number; roles: string[] }, goodId: number): Promise<boolean> {
  if (user.roles.includes('admin')) return true

  const rows = await db
    .select({ courseId: schema.goods.courseId })
    .from(schema.goods)
    .where(eq(schema.goods.id, goodId))
    .limit(1)

  if (!rows[0]) return false
  return canManageGoods(user, rows[0].courseId)
}
