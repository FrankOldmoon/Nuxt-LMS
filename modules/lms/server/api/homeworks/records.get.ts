import { db, schema } from "@nuxthub/db"
import { eq, and } from "drizzle-orm"

export default eventHandler(async (event) => {
  const user = await requireRole(event, ['teacher', 'admin'])

  const { course_id, cid } = getQuery(event)
  if (!course_id || !cid) {
    return cResp(null, 'Missing course_id or cid parameter', false)
  }

  const courseId = Number(course_id)
  const homeworkCid = Number(cid)

  // 1. Get the current user's defaultClass to determine the query scope
  const userRow = await db.select({ defaultClass: schema.users.defaultClass })
    .from(schema.users)
    .where(eq(schema.users.id, user.id))
    .limit(1)

  const classId = (userRow[0]?.defaultClass as any)?.id
  if (!classId) {
    return cResp([])
  }

  // 2. Get the class student userIds (only used to determine the query scope)
  const classUsers = await getClassUsers(classId)
  const studentIds = classUsers.filter(u => !u.isTeacher).map(u => u.id)

  if (studentIds.length === 0) {
    return cResp([])
  }

  // 3. Query the homework submission records of these students, return only userId + record
  const records = await db.query.userHomeworks.findMany({
    where: and(
      eq(schema.userHomeworks.courseId, courseId),
      eq(schema.userHomeworks.homeworkCid, homeworkCid),
    ),
  })

  // 4. Return only the { userId, record } list for those who have records
  const recordMap = new Map(records.map(r => [r.userId, r]))
  const result = studentIds
    .filter(id => recordMap.has(id))
    .map(id => ({
      userId: id,
      record: recordMap.get(id),
    }))

  return cResp(result)
})
