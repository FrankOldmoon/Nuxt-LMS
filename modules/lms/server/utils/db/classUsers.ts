/**
 * 班级用户查询
 *
 * 合并 user_classes 关联表用户（含 isTeacher）与 users.classId 直接归属用户，
 * 并按需合并 userCourses 的 number / group。
 */
import { db, schema } from "@nuxthub/db"
import { eq, inArray, and, isNull } from "drizzle-orm"

/**
 * 获取指定班级的用户列表（user_classes 关联表 + users.class_id 直接归属）
 * 合并去重：关联表用户优先（有 isTeacher 信息），补充直接归属用户
 */
export async function getClassUsers(classId: number, courseId: number = 0) {
  // 1. 通过 user_classes 关联表查询（含 isTeacher 信息）
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

  // 2. 通过 users.class_id 直接归属查询（未在 user_classes 中的）
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

  // 3. 合并去重
  const merged = [...relUsers]
  for (const u of directUsers) {
    if (!relUserIds.has(u.id)) {
      merged.push({ ...u, isTeacher: null })
    }
  }

  // 4. 如果有 courseId，查询 userCourses 的 number 和 group 并合并
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
