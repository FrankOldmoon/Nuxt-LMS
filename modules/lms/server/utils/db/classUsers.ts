/**
 * Class user query
 *
 * Merge users from the user_classes relation table (including isTeacher) with users directly
 * belonging to the class via users.classId, and merge userCourses number / group as needed.
 */
import { db, schema } from "@nuxthub/db"
import { eq, inArray, and, isNull } from "drizzle-orm"

/**
 * Get user list of a class (user_classes relation table + users.class_id direct membership)
 * Merge and dedupe: relation-table users take priority (have isTeacher info), supplement with direct members
 */
export async function getClassUsers(classId: number, courseId: number = 0) {
  // 1. Query through user_classes relation table (includes isTeacher info)
  const relUsers = await db
    .select({
      id: schema.users.id,
      username: schema.users.username,
      name: schema.users.name,
      preferName: schema.users.preferName,
      englishName: schema.users.englishName,
      avatarImg: schema.users.avatarImg,
      rollNumber: schema.users.rollNumber,
      email: schema.users.email,
      telephone: schema.users.telephone,
      loginAt: schema.users.loginAt,
      isTeacher: schema.userClasses.isTeacher,
    })
    .from(schema.userClasses)
    .innerJoin(schema.users, eq(schema.userClasses.userId, schema.users.id))
    .where(
      and(
        eq(schema.userClasses.classId, classId),
        isNull(schema.userClasses.deletedAt),
        isNull(schema.users.deletedAt),
      ),
    )

  // 2. Query through users.class_id direct membership (not present in user_classes)
  const relUserIds = new Set(relUsers.map((u) => u.id))
  const directUsers = await db
    .select({
      id: schema.users.id,
      username: schema.users.username,
      name: schema.users.name,
      preferName: schema.users.preferName,
      englishName: schema.users.englishName,
      avatarImg: schema.users.avatarImg,
      rollNumber: schema.users.rollNumber,
      email: schema.users.email,
      telephone: schema.users.telephone,
      loginAt: schema.users.loginAt,
    })
    .from(schema.users)
    .where(
      and(
        eq(schema.users.classId, classId),
        isNull(schema.users.deletedAt),
      ),
    )

  // 3. Merge and dedupe
  const merged = [...relUsers]
  for (const u of directUsers) {
    if (!relUserIds.has(u.id)) {
      merged.push({ ...u, isTeacher: null })
    }
  }

  // 4. If courseId is provided, query userCourses for number and group, then merge
  if (courseId && merged.length > 0) {
    const userIds = merged.map(u => u.id)
    const userCourses = await db.query.userCourses.findMany({
      where: and(
        eq(schema.userCourses.courseId, courseId),
        inArray(schema.userCourses.userId, userIds),
      ),
    })
    const ucMap = new Map(userCourses.map(uc => [uc.userId, uc]))
    for (const u of merged) {
      const uc = ucMap.get(u.id)
      ;(u as any).number = uc?.number || ''
      ;(u as any).group = uc?.group || ''
    }
  }

  return merged
}
