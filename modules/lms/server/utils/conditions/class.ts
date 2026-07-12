/**
 * 条件类型：class
 *
 * 检查用户是否属于指定班级
 */
import { db, schema } from '@nuxthub/db'
import { and, eq } from 'drizzle-orm'

export async function checkClass(userId: number, value: number | string): Promise<boolean> {
  const classId = Number(value)
  if (!classId) return false
  const rows = await db
    .select({ id: schema.userClasses.userId })
    .from(schema.userClasses)
    .where(and(eq(schema.userClasses.userId, userId), eq(schema.userClasses.classId, classId)))
    .limit(1)
  return rows.length > 0
}
