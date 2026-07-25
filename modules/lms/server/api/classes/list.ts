import { db, schema } from '@nuxthub/db'
import { eq, and, isNull } from 'drizzle-orm'

export default eventHandler(async (event) => {
  const user = await requireAuth(event)

  // admin 返回所有班级
  if (user.roles.includes('admin')) {
    const data = await db
      .select({ id: schema.classes.id, name: schema.classes.name, code: schema.classes.code })
      .from(schema.classes)
      .where(isNull(schema.classes.deletedAt))
      .orderBy(schema.classes.id)
    return cResp(data)
  }

  // 非 admin 只返回 user_classes 中 is_teacher=true 的班级
  const data = await db
    .select({ id: schema.classes.id, name: schema.classes.name, code: schema.classes.code })
    .from(schema.userClasses)
    .innerJoin(schema.classes, eq(schema.userClasses.classId, schema.classes.id))
    .where(and(
      eq(schema.userClasses.userId, user.id),
      eq(schema.userClasses.isTeacher, true),
      isNull(schema.classes.deletedAt),
    ))
    .orderBy(schema.classes.id)

  return cResp(data)
})
