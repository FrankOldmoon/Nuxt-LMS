import { db, schema } from '@nuxthub/db'
import { eq, and, isNull, inArray, notInArray } from 'drizzle-orm'

/** 更新用户的任教信息 */
export default eventHandler(async (event) => {
  await requireAdmin(event)

  const body = await readBody(event)
  const { userId, teachingClassIds, teachingCourseIds, editorCourseIds } = body

  if (!userId) return cResp(null, '缺少 userId', false)

  const uid = Number(userId)

  // ========== 任教班级 ==========
  // 删除旧的
  await db
    .delete(schema.userClasses)
    .where(
      and(
        eq(schema.userClasses.userId, uid),
        eq(schema.userClasses.isTeacher, true),
      ),
    )
  // 插入新的
  if (Array.isArray(teachingClassIds) && teachingClassIds.length) {
    await db.insert(schema.userClasses).values(
      teachingClassIds.map((classId: number) => ({
        userId: uid,
        classId,
        isTeacher: true,
      })),
    ).onConflictDoNothing()
  }

  // ========== 任教课程：清除旧的 isTeacher ==========
  await db
    .update(schema.userCourses)
    .set({ isTeacher: null })
    .where(
      and(
        eq(schema.userCourses.userId, uid),
        eq(schema.userCourses.isTeacher, true),
        isNull(schema.userCourses.deletedAt),
      ),
    )

  // ========== 编辑者课程：清除旧的 isEditor ==========
  await db
    .update(schema.userCourses)
    .set({ isEditor: null })
    .where(
      and(
        eq(schema.userCourses.userId, uid),
        eq(schema.userCourses.isEditor, true),
        isNull(schema.userCourses.deletedAt),
      ),
    )

  // ========== 插入/更新任教课程 ==========
  if (Array.isArray(teachingCourseIds) && teachingCourseIds.length) {
    for (const courseId of teachingCourseIds) {
      await db
        .insert(schema.userCourses)
        .values({ userId: uid, courseId, isTeacher: true })
        .onConflictDoUpdate({
          target: [schema.userCourses.userId, schema.userCourses.courseId],
          set: { isTeacher: true },
        })
    }
  }

  // ========== 插入/更新编辑者课程 ==========
  if (Array.isArray(editorCourseIds) && editorCourseIds.length) {
    for (const courseId of editorCourseIds) {
      await db
        .insert(schema.userCourses)
        .values({ userId: uid, courseId, isEditor: true })
        .onConflictDoUpdate({
          target: [schema.userCourses.userId, schema.userCourses.courseId],
          set: { isEditor: true },
        })
    }
  }

  return cResp({ success: true })
})
