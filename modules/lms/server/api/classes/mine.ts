import { db, schema } from '@nuxthub/db'
import { eq, and, isNull } from 'drizzle-orm'

/**
 * 返回当前用户可选择的班级（学生视角）
 * = users.classId 主班级 ∪ userClasses 关联班级（排除已删除，按 id 去重）
 *
 * 与 list.ts 区别：list.ts 对非 admin 只返回 is_teacher=true 的班级（供管理），
 * 此端点面向学生选班，返回其作为成员的所有班级 + 主班级。
 */
export default eventHandler(async (event) => {
  const authUser = await requireAuth(event)

  // requireAuth 返回的 AuthUser 不含 classId，单独查询
  const userRows = await db
    .select({ classId: schema.users.classId })
    .from(schema.users)
    .where(eq(schema.users.id, authUser.id))
    .limit(1)
  const mainClassId = userRows[0]?.classId ?? null

  // userClasses 关联的所有班级（不含已删除）
  const associated = await db
    .select({ id: schema.classes.id, name: schema.classes.name, code: schema.classes.code })
    .from(schema.userClasses)
    .innerJoin(schema.classes, eq(schema.userClasses.classId, schema.classes.id))
    .where(and(
      eq(schema.userClasses.userId, authUser.id),
      isNull(schema.classes.deletedAt),
    ))
    .orderBy(schema.classes.id)

  let result = [...associated]

  // 主班级不在关联列表中时单独查询
  if (mainClassId && !associated.some((c) => c.id === mainClassId)) {
    const mainClass = await db
      .select({ id: schema.classes.id, name: schema.classes.name, code: schema.classes.code })
      .from(schema.classes)
      .where(and(eq(schema.classes.id, mainClassId), isNull(schema.classes.deletedAt)))
      .limit(1)
    if (mainClass[0]) result = [mainClass[0], ...result]
  }

  // 按 id 去重
  const seen = new Set<number>()
  const deduped = result.filter((c) => {
    if (seen.has(c.id)) return false
    seen.add(c.id)
    return true
  })

  return cResp(deduped)
})
