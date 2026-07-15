import { db, schema } from "@nuxthub/db"
import { eq, and } from "drizzle-orm"

export default eventHandler(async (event) => {
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
    const result = await db.update(schema.quizzes).set(body).where(and(
      eq(schema.quizzes.courseId, course_id),
      eq(schema.quizzes.cid, id)
    ))
    return cResp(result)
  } catch (error: any) {
    console.error('Update failed:', error)
    return cResp(null, error.message || 'Update failed', false)
  }
})
