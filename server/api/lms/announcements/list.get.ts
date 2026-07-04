/**
 * 公告列表
 * GET /api/lms/announcements/list?courseId=X
 *
 * 权限：
 * - 课程教师 / 管理员：返回本课程全部公告
 * - 学生：仅返回 classId = 自己班级 或 classId IS NULL（面向全员）的公告
 *
 * 时间倒序
 */
import { db, schema } from '@nuxthub/db'
import { eq, and, or, isNull, desc } from 'drizzle-orm'

export default eventHandler(async (event) => {
  const user = await requireAuth(event)
  const courseId = Number(getQuery(event).courseId)
  if (!courseId) return cResp([], '缺少 courseId', false)

  const isStaff = user.roles.includes('admin')
    || user.roles.includes('teacher')
    || (await isCourseTeacher(user.id, courseId))

  if (isStaff) {
    // 教师/管理员：返回全部
    const rows = await db
      .select()
      .from(schema.announcements)
      .where(eq(schema.announcements.courseId, courseId))
      .orderBy(desc(schema.announcements.createdAt))
    return cResp(rows)
  }

  // 学生：先查自己所在的班级（classId）
  const userRows = await db
    .select({ classId: schema.users.classId })
    .from(schema.users)
    .where(eq(schema.users.id, user.id))
    .limit(1)
  const userClassId = userRows[0]?.classId || null

  // 仅 classId 命中或未指定（面向全员）
  const where = userClassId
    ? and(
        eq(schema.announcements.courseId, courseId),
        or(isNull(schema.announcements.classId), eq(schema.announcements.classId, userClassId)),
      )
    : and(
        eq(schema.announcements.courseId, courseId),
        isNull(schema.announcements.classId),
      )

  const rows = await db
    .select()
    .from(schema.announcements)
    .where(where)
    .orderBy(desc(schema.announcements.createdAt))
  return cResp(rows)
})
