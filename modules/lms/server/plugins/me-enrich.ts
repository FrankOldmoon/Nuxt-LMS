/**
 * 注册 me 接口字段扩展：注入 teacherCourseIds / editorCourseIds / classIds
 *
 * base 模块的 /api/auth/me 通过 runOnMeEnrich 调用本钩子，
 * 将课程/班级关联 ID 注入认证数据，供前端 useAuthLms 使用。
 */
import { db, schema } from '@nuxthub/db'
import { eq, and, isNull, or } from 'drizzle-orm'
import { registerOnMeEnrich } from '../../../base/server/utils/hooks'

export default defineNitroPlugin(() => {
  registerOnMeEnrich(async (user) => {
    const userId = user.id
    if (!userId) return {}

    // 查询用户有教师/编辑者身份的课程
    const courseRows = await db
      .select({
        courseId: schema.userCourses.courseId,
        isTeacher: schema.userCourses.isTeacher,
        isEditor: schema.userCourses.isEditor,
      })
      .from(schema.userCourses)
      .where(
        and(
          eq(schema.userCourses.userId, userId),
          isNull(schema.userCourses.deletedAt),
          or(
            eq(schema.userCourses.isTeacher, true),
            eq(schema.userCourses.isEditor, true),
          ),
        ),
      )

    const teacherCourseIds = courseRows
      .filter((r) => r.isTeacher)
      .map((r) => r.courseId)
    const editorCourseIds = courseRows
      .filter((r) => r.isEditor)
      .map((r) => r.courseId)

    // 查询用户关联的班级
    const classRows = await db
      .select({ classId: schema.userClasses.classId })
      .from(schema.userClasses)
      .where(eq(schema.userClasses.userId, userId))

    const classIds = classRows.map((r) => r.classId)

    return { teacherCourseIds, editorCourseIds, classIds }
  })
})
