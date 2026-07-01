import { db, schema } from "@nuxthub/db"
import { eq, and, isNull } from "drizzle-orm"

/**
 * 添加或移除课程的教师/编辑者
 * body: { courseId, userId, role: 'teacher'|'editor', action: 'add'|'remove' }
 */
export default eventHandler(async (event) => {
  const body = await readBody(event)
  const { courseId, userId, role, action } = body

  if (!courseId || !userId || !role || !action) {
    return cResp(null, '缺少参数', false)
  }

  if (!['teacher', 'editor'].includes(role) || !['add', 'remove'].includes(action)) {
    return cResp(null, '参数无效', false)
  }

  // 仅管理员可管理课程成员
  await requireAdmin(event)

  // 查询是否已有 user_courses 记录
  const existing = await db
    .select()
    .from(schema.userCourses)
    .where(
      and(
        eq(schema.userCourses.courseId, Number(courseId)),
        eq(schema.userCourses.userId, Number(userId)),
        isNull(schema.userCourses.deletedAt),
      ),
    )
    .limit(1)

  const isFlag = role === 'teacher' ? 'isTeacher' : 'isEditor'
  const flagValue = action === 'add'

  try {
    if (existing[0]) {
      // 更新已有记录
      await db
        .update(schema.userCourses)
        .set({ [isFlag]: flagValue } as any)
        .where(
          and(
            eq(schema.userCourses.courseId, Number(courseId)),
            eq(schema.userCourses.userId, Number(userId)),
          ),
        )
    } else if (action === 'add') {
      // 新增记录（仅 add 时创建）
      await db
        .insert(schema.userCourses)
        .values({
          courseId: Number(courseId),
          userId: Number(userId),
          isTeacher: role === 'teacher',
          isEditor: role === 'editor',
        })
    }

    return cResp({ success: true })
  } catch (error: any) {
    console.error('更新课程成员失败:', error)
    return cResp(null, error.statusMessage || '更新失败', false)
  }
})
