import { db, schema } from '@nuxthub/db'
import { eq, and, isNull, inArray, notInArray } from 'drizzle-orm'

/** 获取用户的任教信息 */
export default eventHandler(async (event) => {
  await requireAuth(event)

  const userId = Number(getQuery(event).userId) || 0

  // 非本人需管理员权限
  const authUser = event.context.user
  if (userId && userId !== authUser?.id) {
    await requireAdmin(event)
  }

  const uid = userId || authUser?.id
  if (!uid) return cResp(null, '用户未登录', false)

  // 任教班级
  const teachingClasses = await db
    .select({ classId: schema.userClasses.classId })
    .from(schema.userClasses)
    .where(
      and(
        eq(schema.userClasses.userId, uid),
        eq(schema.userClasses.isTeacher, true),
        isNull(schema.userClasses.deletedAt),
      ),
    )

  // 任教课程 / 编辑者课程
  const courseRows = await db
    .select({
      courseId: schema.userCourses.courseId,
      isTeacher: schema.userCourses.isTeacher,
      isEditor: schema.userCourses.isEditor,
    })
    .from(schema.userCourses)
    .where(
      and(
        eq(schema.userCourses.userId, uid),
        isNull(schema.userCourses.deletedAt),
      ),
    )

  return cResp({
    teachingClassIds: teachingClasses.map((r) => r.classId),
    teachingCourseIds: courseRows.filter((r) => r.isTeacher).map((r) => r.courseId),
    editorCourseIds: courseRows.filter((r) => r.isEditor).map((r) => r.courseId),
  })
})
