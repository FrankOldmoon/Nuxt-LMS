import { db, schema } from "@nuxthub/db"
import { eq, and } from "drizzle-orm"

export default eventHandler(async (event) => {
  await requireRole(event, ['teacher', 'admin'])

  const body = await readBody(event)
  const { course_id, user_id, number, group } = body

  if (!course_id || !user_id) {
    return cResp(null, 'Missing course_id or user_id parameter', false)
  }

  const courseId = Number(course_id)
  const userId = Number(user_id)

  try {
    // Check whether a record already exists
    const existing = await db.query.userCourses.findFirst({
      where: and(
        eq(schema.userCourses.userId, userId),
        eq(schema.userCourses.courseId, courseId),
      ),
    })

    if (existing) {
      // Existing record: update
      const updateData: any = {}
      if (number !== undefined) updateData.number = number || null
      if (group !== undefined) updateData.group = group || null

      const result = await db.update(schema.userCourses).set(updateData).where(and(
        eq(schema.userCourses.userId, userId),
        eq(schema.userCourses.courseId, courseId),
      )).returning()
      return cResp(result[0] || null)
    } else {
      // No record: insert
      const insertData: any = {
        userId,
        courseId,
      }
      if (number !== undefined) insertData.number = number || null
      if (group !== undefined) insertData.group = group || null

      const result = await db.insert(schema.userCourses).values(insertData).returning()
      return cResp(result[0] || null)
    }
  } catch (error: any) {
    console.error('Failed to update number:', error)
    return cResp(null, error.message || 'Update failed', false)
  }
})
