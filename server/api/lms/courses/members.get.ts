import { db, schema } from "@nuxthub/db"
import { eq, and, or, isNull } from "drizzle-orm"

/** 获取课程的教师和编辑者列表 */
export default eventHandler(async (event) => {
  const courseId = Number(getQuery(event).id)
  if (!courseId) {
    return cResp(null, '缺少 id 参数', false)
  }

  // 管理员或课程编辑者可查看
  await requireCourseTeacher(event, courseId)

  const members = await db
    .select({
      userId: schema.userCourses.userId,
      isTeacher: schema.userCourses.isTeacher,
      isEditor: schema.userCourses.isEditor,
      username: schema.users.username,
      name: schema.users.name,
      avatarImg: schema.users.avatarImg,
    })
    .from(schema.userCourses)
    .innerJoin(schema.users, eq(schema.userCourses.userId, schema.users.id))
    .where(
      and(
        eq(schema.userCourses.courseId, courseId),
        isNull(schema.userCourses.deletedAt),
        or(
          eq(schema.userCourses.isTeacher, true),
          eq(schema.userCourses.isEditor, true),
        ),
      ),
    )

  return cResp(members)
})
