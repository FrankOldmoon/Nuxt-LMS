import { db, schema } from "@nuxthub/db"
import { and, or, isNull, ilike } from "drizzle-orm"

/** 搜索用户（按用户名或姓名模糊匹配），排除已软删除的 */
export default eventHandler(async (event) => {
  // 仅管理员或课程编辑者可搜索
  const courseId = Number(getQuery(event).courseId)
  if (courseId) {
    await requireCourseTeacher(event, courseId)
  } else {
    await requireAuth(event)
  }

  const keyword = String(getQuery(event).keyword || '').trim()
  if (!keyword) {
    return cResp([])
  }

  const users = await db
    .select({
      id: schema.users.id,
      username: schema.users.username,
      name: schema.users.name,
      avatarImg: schema.users.avatarImg,
    })
    .from(schema.users)
    .where(
      and(
        isNull(schema.users.deletedAt),
        or(
          ilike(schema.users.username, `%${keyword}%`),
          ilike(schema.users.name, `%${keyword}%`),
        ),
      ),
    )
    .limit(100)

  return cResp(users)
})
