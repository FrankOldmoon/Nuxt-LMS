import { db, schema } from "@nuxthub/db"
import { eq, desc } from "drizzle-orm"

export default eventHandler(async (event) => {
  // Only teachers/admins can add
  await requireRole(event, ['teacher', 'admin'])

  const body = await readBody(event)
  const { course_id } = body

  if (!course_id) {
    return cResp(null, 'Missing course_id parameter', false)
  }

  try {
    // Query the maximum cid in this course
    const maxCidResult = await db.select({ cid: schema.homeworks.cid })
      .from(schema.homeworks)
      .where(eq(schema.homeworks.courseId, course_id))
      .orderBy(desc(schema.homeworks.cid))
      .limit(1)

    // Generate a new cid (default to 1 if none exists)
    const maxCid = maxCidResult[0]?.cid ?? 0
    const newCid = maxCid + 1

    // Prepare data to insert
    const insertData = {
      ...body,
      courseId: course_id,
      cid: newCid,
    }

    // Remove unwanted fields
    delete insertData.course_id

    // Insert new record
    const result = await db.insert(schema.homeworks).values(insertData).returning()
    // Return the newly inserted record (including cid)
    return cResp(result[0])
  } catch (error: any) {
    console.error('Failed to add homework:', error)
    return cResp(null, error.message || 'Add failed', false)
  }
})
