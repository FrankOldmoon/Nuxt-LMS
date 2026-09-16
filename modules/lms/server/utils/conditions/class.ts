/**
 * 条件类型：class
 *
 * 检查用户是否属于指定班级。
 * 班级归属口径 = userClasses 关联表 ∪ users.classId 主班级 ∪ users.defaultClass.id 当前班级，
 * 与 /api/classes/mine、getClassUsers、courses/show.get.ts 一致（覆盖仅设 users 表字段的学生）。
 */
import { db, schema } from '@nuxthub/db'
import { and, eq, isNull } from 'drizzle-orm'

export async function checkClass(userId: number, value: number | string): Promise<boolean> {
  const classId = Number(value)
  if (!classId) return false

  // 1. 主班级 / 当前班级：users.classId、users.defaultClass.id
  const userRows = await db
    .select({ classId: schema.users.classId, defaultClass: schema.users.defaultClass })
    .from(schema.users)
    .where(eq(schema.users.id, userId))
    .limit(1)
  const u = userRows[0]
  if (u) {
    const primaryClassId = Number(u.classId) || 0
    const defaultClassId = Number((u.defaultClass as any)?.id) || 0
    console.log('[condition] checkClass 主班级', { userId, classId, primaryClassId, defaultClassId })
    if (primaryClassId === classId || defaultClassId === classId) return true
  }

  // 2. userClasses 关联表（排除软删除）
  const rows = await db
    .select({ id: schema.userClasses.userId })
    .from(schema.userClasses)
    .where(and(
      eq(schema.userClasses.userId, userId),
      eq(schema.userClasses.classId, classId),
      isNull(schema.userClasses.deletedAt),
    ))
    .limit(1)
  return rows.length > 0
}
