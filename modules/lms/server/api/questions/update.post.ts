import { db, schema } from "@nuxthub/db"
import { eq, and } from "drizzle-orm"  // Only need to import eq and and

export default eventHandler(async (event) => {
  // Only teachers/admins can update
  await requireRole(event, ['teacher', 'admin'])

  const body = await readBody(event)
  const { course_id, id } = body

  if (!course_id || !id) {
    return cResp(null, 'Missing id parameter', false)
  }

  delete body.cid
  delete body.course_id
  delete body.id

  try {
    const result = await db.update(schema.questions).set(body).where(and(
      eq(schema.questions.courseId, course_id),
      eq(schema.questions.cid, id)
    ))
    return cResp(result)
  } catch (error: any) {
    console.error('Update failed:', error)
    return cResp(null, error.message || 'Update failed', false)
  }
})
