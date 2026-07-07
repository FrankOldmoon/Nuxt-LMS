/**
 * 小组管理：更新学生分组
 * POST /api/courses/groups
 * body: { courseId, groups: { "group1": [{userId}, ...], ... } }
 *
 * 只有组长（index 0）的 group 字段带 c_ 前缀，用于标识组长身份
 */
import { db, schema } from '@nuxthub/db'
import { eq, and } from 'drizzle-orm'

export default eventHandler(async (event) => {
  const user = await requireAuth(event)
  const body = await readBody(event)
  const { courseId, groups } = body

  if (!courseId) return cResp(null, '缺少 courseId', false)
  if (!groups || typeof groups !== 'object') return cResp(null, '缺少 groups', false)

  // 只有教师或管理员可以修改分组
  const isTeacher = await isCourseTeacher(user.id, Number(courseId))
  if (!isTeacher && !user.roles.includes('admin')) {
    return cResp(null, '无权限', false)
  }

  // 1. 先清除本课程所有学生的 group（设为 null）
  await db.update(schema.userCourses)
    .set({ group: null })
    .where(and(
      eq(schema.userCourses.courseId, Number(courseId)),
      eq(schema.userCourses.isTeacher, false),
    ))

  // 2. 批量 upsert：没有 user_courses 记录的自动插入
  for (const [groupName, members] of Object.entries(groups)) {
    const cleanName = groupName.startsWith('c_') ? groupName.slice(2) : groupName
    for (let i = 0; i < (members as any[]).length; i++) {
      const member = (members as any[])[i]
      // 组长（第一个）加 c_ 前缀，其他成员不加
      const groupValue = i === 0 ? `c_${cleanName}` : cleanName
      await db.insert(schema.userCourses)
        .values({
          userId: member.userId,
          courseId: Number(courseId),
          isTeacher: false,
          group: groupValue,
        })
        .onConflictDoUpdate({
          target: [schema.userCourses.userId, schema.userCourses.courseId],
          set: { group: groupValue },
        })
    }
  }

  return cResp(null, '分组更新成功')
})
