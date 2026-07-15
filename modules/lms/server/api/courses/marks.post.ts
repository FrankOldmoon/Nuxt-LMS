/**
 * Add/Subtract marks: batch update user_courses.marks_score field
 * POST /api/courses/marks
 * body: { course_id, user_ids: number[], delta: number }
 *
 * Positive delta adds marks, negative subtracts. Only teachers/admins can call.
 */
import { db, schema } from '@nuxthub/db'
import { eq, and, inArray, sql } from 'drizzle-orm'

export default eventHandler(async (event) => {
  await requireRole(event, ['teacher', 'admin'])

  const body = await readBody(event)
  const { course_id, user_ids, delta } = body

  if (!course_id || !Array.isArray(user_ids) || user_ids.length === 0) {
    return cResp(null, 'Missing course_id or user_ids parameter', false)
  }
  const numDelta = Number(delta)
  if (isNaN(numDelta) || numDelta === 0) {
    return cResp(null, 'Invalid delta', false)
  }

  const courseId = Number(course_id)
  const userIds = user_ids.map(Number)

  try {
    // Add/subtract marks for existing records (COALESCE guards against NULL)
    await db.update(schema.userCourses)
      .set({
        marksScore: sql`COALESCE(${schema.userCourses.marksScore}, 0) + ${numDelta}`,
      })
      .where(and(
        eq(schema.userCourses.courseId, courseId),
        inArray(schema.userCourses.userId, userIds),
      ))

    // Create initial records for students without a record
    const existing = await db
      .select({ userId: schema.userCourses.userId })
      .from(schema.userCourses)
      .where(and(
        eq(schema.userCourses.courseId, courseId),
        inArray(schema.userCourses.userId, userIds),
      ))
    const existingIds = new Set(existing.map(r => r.userId))
    const missingIds = userIds.filter(id => !existingIds.has(id))
    if (missingIds.length > 0) {
      await db.insert(schema.userCourses).values(
        missingIds.map(uid => ({
          userId: uid,
          courseId,
          marksScore: String(Math.max(0, numDelta)),
        }))
      )
    }

    return cResp({ success: true, delta: numDelta })
  } catch (error: any) {
    console.error('Failed to add/subtract marks:', error)
    return cResp(null, error.message || 'Failed to add/subtract marks', false)
  }
})
