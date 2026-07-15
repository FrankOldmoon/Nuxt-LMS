import { db, schema } from "@nuxthub/db"
import { eq, and } from "drizzle-orm"

/**
 * Get all student submission records for a quiz
 * query: course_id, cid
 */
export default eventHandler(async (event) => {
  const user = await requireRole(event, ['teacher', 'admin'])

  const { course_id, cid } = getQuery(event)
  if (!course_id || !cid) {
    return cResp(null, 'Missing parameters', false)
  }

  const courseId = Number(course_id)
  const quizCid = Number(cid)

  // Get teacher's default class
  const userRow = await db.select({ defaultClass: schema.users.defaultClass })
    .from(schema.users)
    .where(eq(schema.users.id, user.id))
    .limit(1)

  const classId = (userRow[0]?.defaultClass as any)?.id
  if (!classId) {
    return cResp([])
  }

  // Get class students
  const classUsers = await getClassUsers(classId)
  const studentIds = classUsers.filter(u => !u.isTeacher).map(u => u.id)

  if (studentIds.length === 0) {
    return cResp([])
  }

  // Query quiz submission records
  const records = await db.query.userQuizzes.findMany({
    where: and(
      eq(schema.userQuizzes.courseId, courseId),
      eq(schema.userQuizzes.quizCid, quizCid),
    ),
  })

  const recordMap = new Map(records.map(r => [r.userId, r]))
  const result = studentIds
    .filter(id => recordMap.has(id))
    .map(id => ({
      userId: id,
      record: recordMap.get(id),
    }))

  return cResp(result)
})
