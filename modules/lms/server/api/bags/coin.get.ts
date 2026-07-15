import { db, schema } from '@nuxthub/db'
import { eq, and } from 'drizzle-orm'

/** Get the current user's coin balance for the specified course */
export default eventHandler(async (event) => {
  const user = await requireAuth(event)
  const courseId = Number(getQuery(event).courseId) || 0
  if (!courseId) return cResp(null, 'Missing courseId parameter', false)

  const rows = await db
    .select({ coin: schema.userCourses.coin })
    .from(schema.userCourses)
    .where(and(eq(schema.userCourses.userId, user.id), eq(schema.userCourses.courseId, courseId)))
    .limit(1)

  return cResp({ coin: rows[0]?.coin || 0 })
})
