/**
 * 小组管理：获取指定班级在本课程的分组信息
 * GET /api/courses/groups?courseId=1&classId=2
 *
 * 仅返回 userId + group + score，学生信息由前端从 useClassUsers 缓存合并
 * group 格式：c_<groupName>，组内排序第一个是组长
 */
import { db, schema } from '@nuxthub/db'
import { eq, and, inArray } from 'drizzle-orm'

export default eventHandler(async (event) => {
  const user = await requireAuth(event)
  const query = getQuery(event)
  const courseId = Number(query.courseId)
  const classId = Number(query.classId) || 0
  if (!courseId) return cResp(null, '缺少 courseId', false)
  if (!classId) return cResp(null, '缺少 classId', false)

  // 获取该班级学生 userIds（仅用于确定查询范围）
  const classUsers = await getClassUsers(classId, courseId)
  const studentIds = classUsers.filter(u => !u.isTeacher).map(u => u.id)
  if (studentIds.length === 0) return cResp([])

  // 查询这些学生在本课程的分组和得分
  const rows = await db
    .select({
      userId: schema.userCourses.userId,
      group: schema.userCourses.group,
      score: schema.userCourses.score,
    })
    .from(schema.userCourses)
    .where(and(
      eq(schema.userCourses.courseId, courseId),
      inArray(schema.userCourses.userId, studentIds),
    ))

  const result = rows.map(r => ({
    userId: r.userId,
    group: r.group || '',
    score: Number(r.score) || 0,
  }))

  return cResp(result)
})
