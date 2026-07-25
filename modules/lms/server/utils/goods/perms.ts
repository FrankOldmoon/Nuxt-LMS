/**
 * 商品管理权限校验
 *
 * - admin：可管理所有商品（含全局 courseId=0）
 * - 教师/编辑者：仅可管理自己课程的商品（courseId > 0）
 * - 全局商品（courseId=0）：仅 admin 可管理
 */
import { db, schema } from '@nuxthub/db'
import { eq, and } from 'drizzle-orm'

/**
 * 检查用户是否可管理指定课程的商品
 * admin 总是返回 true；courseId=0 仅 admin；courseId>0 需为该课程教师/编辑者
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
 * 检查用户是否可管理某个已存在商品
 * 先查商品的 courseId，再校验权限
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
