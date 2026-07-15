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
    const maxCidResult = await db.select({ cid: schema.questions.cid })
      .from(schema.questions)
      .where(eq(schema.questions.courseId, course_id))
      .orderBy(desc(schema.questions.cid))
      .limit(1)

    // Generate a new cid (defaults to 1 if not exists)
    const maxCid = maxCidResult[0]?.cid ?? 0
    const newCid = maxCid + 1

    // Prepare data to insert
    const insertData = {
      ...body,
      courseId: course_id,
      cid: newCid,
    }

    // Remove unnecessary fields
    delete insertData.course_id

    // Insert new record
    const result = await db.insert(schema.questions).values(insertData).returning()
    // Return the new inserted record (including cid)
    return cResp(result[0])
  } catch (error: any) {
    console.error('Failed to add question:', error)
    return cResp(null, error.message || 'Add failed', false)
  }
})
