import { db, schema } from '@nuxthub/db'
import { eq, and, isNull } from 'drizzle-orm'

/**
 * Return the classes the current user can choose (student view)
 * = users.classId primary class ∪ userClasses associated classes (excluding deleted, deduped by id)
 *
 * Difference from list.ts: list.ts returns only is_teacher=true classes for non-admins (for management);
 * this endpoint targets student class selection and returns all classes they are a member of + the primary class.
 */
export default eventHandler(async (event) => {
  const authUser = await requireAuth(event)

  // requireAuth's AuthUser doesn't include classId, so query separately
  const userRows = await db
    .select({ classId: schema.users.classId })
    .from(schema.users)
    .where(eq(schema.users.id, authUser.id))
    .limit(1)
  const mainClassId = userRows[0]?.classId ?? null

  // All classes associated via userClasses (excluding deleted)
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

  // If the primary class is not in the associated list, query it separately
  if (mainClassId && !associated.some((c) => c.id === mainClassId)) {
    const mainClass = await db
      .select({ id: schema.classes.id, name: schema.classes.name, code: schema.classes.code })
      .from(schema.classes)
      .where(and(eq(schema.classes.id, mainClassId), isNull(schema.classes.deletedAt)))
      .limit(1)
    if (mainClass[0]) result = [mainClass[0], ...result]
  }

  // Dedupe by id
  const seen = new Set<number>()
  const deduped = result.filter((c) => {
    if (seen.has(c.id)) return false
    seen.add(c.id)
    return true
  })

  return cResp(deduped)
})
