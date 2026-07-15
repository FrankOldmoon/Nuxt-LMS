/**
 * Group management: get the grouping info of a class for a course
 * GET /api/courses/groups?courseId=1&classId=2
 *
 * Returns only userId + group + score; student info is merged by the frontend from useClassUsers cache
 * group format: c_<groupName>; the first member by sort order is the group leader
 */
import { db, schema } from '@nuxthub/db'
import { eq, and, inArray } from 'drizzle-orm'

export default eventHandler(async (event) => {
  const user = await requireAuth(event)
  const query = getQuery(event)
  const courseId = Number(query.courseId)
  const classId = Number(query.classId) || 0
  if (!courseId) return cResp(null, 'Missing courseId', false)
  if (!classId) return cResp(null, 'Missing classId', false)

  // Get the class student userIds (only used to determine query scope)
  const classUsers = await getClassUsers(classId, courseId)
  const studentIds = classUsers.filter(u => !u.isTeacher).map(u => u.id)
  if (studentIds.length === 0) return cResp([])

  // Query the group and score of these students in this course
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
