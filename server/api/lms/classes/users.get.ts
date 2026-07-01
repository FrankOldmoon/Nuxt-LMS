import { db, schema } from "@nuxthub/db"
import { eq, and, isNull } from "drizzle-orm"

/** 获取指定班级的用户列表（user_classes 关联表 + users.class_id 直接归属） */
export default eventHandler(async (event) => {
  const classId = Number(getQuery(event).classId)
  if (!classId) {
    return cResp(null, '缺少 classId 参数', false)
  }

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
    })
    .from(schema.users)
    .where(
      and(
        eq(schema.users.classId, classId),
        isNull(schema.users.deletedAt),
      ),
    )

  // 3. 合并去重：关联表用户优先（有 isTeacher 信息），补充直接归属用户
  const merged = [...relUsers]
  for (const u of directUsers) {
    if (!relUserIds.has(u.id)) {
      merged.push({ ...u, isTeacher: null })
    }
  }

  return cResp(merged)
})
