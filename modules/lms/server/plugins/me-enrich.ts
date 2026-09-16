/**
 * 注册 me 接口字段扩展：注入 teacherCourseIds / editorCourseIds / classIds
 *
 * base 模块的 /api/auth/me 通过 runOnMeEnrich 调用本钩子，
 * 将课程/班级关联 ID 注入认证数据，供前端 useAuthLms 使用。
 *
 * classIds 口径（前端 condition 等本地判定的唯一数据源）：
 *   userClasses 关联 ∪ users.classId 主班级 ∪ users.defaultClass.id 当前班级（去重、排除已删除）
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

    // 班级名单（含名称）：userClasses 关联班级 ∪ users.classId 主班级，去重、排除已删除。
    // 前端 usercard 等直接读取，无需再单独请求 /api/classes/mine。
    const associated = await db
      .select({ id: schema.classes.id, name: schema.classes.name })
      .from(schema.userClasses)
      .innerJoin(schema.classes, eq(schema.userClasses.classId, schema.classes.id))
      .where(and(
        eq(schema.userClasses.userId, userId),
        isNull(schema.userClasses.deletedAt),
        isNull(schema.classes.deletedAt),
      ))
    let classes: { id: number; name: string }[] = associated
    const primaryClassId = user.classId
    if (primaryClassId && !associated.some((c) => c.id === primaryClassId)) {
      const primary = await db
        .select({ id: schema.classes.id, name: schema.classes.name })
        .from(schema.classes)
        .where(and(eq(schema.classes.id, primaryClassId), isNull(schema.classes.deletedAt)))
        .limit(1)
      if (primary[0]) classes = [primary[0], ...classes]
    }

    // classIds：班级归属判定口径 = userClasses 关联 ∪ users.classId 主班级 ∪ users.defaultClass.id 当前班级。
    // 与 courses/show.get.ts、getClassUsers、条件判断 checkClass 保持一致
    // （此前只取 userClasses，导致仅设 users 表班级字段的学生 class 条件永不通过）。
    const defaultClassId = Number((user.defaultClass as any)?.id) || 0
    const classIds = [...new Set([
      ...classes.map((c) => c.id),
      ...(defaultClassId ? [defaultClassId] : []),
    ])]
    console.log('[me-enrich] classIds', classIds, 'defaultClassId', defaultClassId)

    return { teacherCourseIds, editorCourseIds, classIds, classes }
  })
})
