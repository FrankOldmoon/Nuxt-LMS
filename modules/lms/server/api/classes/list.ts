import { db, schema } from '@nuxthub/db'
import { eq, and, isNull } from 'drizzle-orm'

export default eventHandler(async (event) => {
  const user = await requireAuth(event)

  // admin returns all classes
  if (user.roles.includes('admin')) {
    const data = await db
      .select({ id: schema.classes.id, name: schema.classes.name, code: schema.classes.code })
      .from(schema.classes)
      .where(isNull(schema.classes.deletedAt))
      .orderBy(schema.classes.id)
    return cResp(data)
  }

  // Non-admin only returns classes where user_classes.is_teacher=true
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
