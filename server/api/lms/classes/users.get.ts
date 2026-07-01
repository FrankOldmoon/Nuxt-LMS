import { db, schema } from "@nuxthub/db"
import { eq, and, isNull } from "drizzle-orm"

/** 获取指定班级的用户列表 */
export default eventHandler(async (event) => {
  const classId = Number(getQuery(event).classId)
  if (!classId) {
    return cResp(null, '缺少 classId 参数', false)
  }

  const users = await db
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

  return cResp(users)
})
