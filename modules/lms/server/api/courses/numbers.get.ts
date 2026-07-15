import { db, schema } from "@nuxthub/db"
import { eq } from "drizzle-orm"

export default eventHandler(async (event) => {
  await requireRole(event, ['teacher', 'admin'])

  const { course_id } = getQuery(event)
  if (!course_id) {
    return cResp(null, 'Missing course_id parameter', false)
  }

  const data = await db.query.userCourses.findMany({
    where: eq(schema.userCourses.courseId, Number(course_id)),
  })

  // Return { userId: number } map
  const map = {}
  for (const uc of data) {
    map[uc.userId] = uc.number || ''
  }
  return cResp(map)
})
