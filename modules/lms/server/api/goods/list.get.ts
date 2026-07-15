import { db, schema } from '@nuxthub/db'
import { eq, or } from 'drizzle-orm'

/**
 * Get shop goods list (for students browsing)
 * ?courseId=x returns global goods (courseId=0) + course-specific goods
 */
export default eventHandler(async (event) => {
  await requireAuth(event)
  const courseId = Number(getQuery(event).courseId) || 0

  const rows = await db
    .select()
    .from(schema.goods)
    .where(or(eq(schema.goods.courseId, 0), eq(schema.goods.courseId, courseId)))
    .orderBy(schema.goods.order)

  return cResp(rows)
})
