import { db, schema } from "@nuxthub/db"
import { eq, desc } from "drizzle-orm"

export default eventHandler(async (event) => {
  await requireRole(event, ['teacher', 'admin'])

  const body = await readBody(event)
  const { course_id } = body

  if (!course_id) {
    return cResp(null, 'Missing course_id parameter', false)
  }

  try {
    const maxCidResult = await db.select({ cid: schema.races.cid })
      .from(schema.races)
      .where(eq(schema.races.courseId, course_id))
      .orderBy(desc(schema.races.cid))
      .limit(1)

    const newCid = (maxCidResult[0]?.cid ?? 0) + 1

    const insertData = {
      ...body,
      courseId: course_id,
      cid: newCid,
    }
    delete insertData.course_id

    const result = await db.insert(schema.races).values(insertData).returning()
    return cResp(result[0])
  } catch (error: any) {
    console.error('Failed to add race:', error)
    return cResp(null, error.message || 'Add failed', false)
  }
})
