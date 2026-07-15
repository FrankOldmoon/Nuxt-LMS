/**
 * Extra score: directly set the user_courses.extra_score field
 * POST /api/courses/extra-score
 * body: { course_id, user_id, extra_score }
 *
 * The teacher enters and saves the extra score for a single student in the grade table. Only teacher/admin can call this.
 */
import { db, schema } from '@nuxthub/db'

export default eventHandler(async (event) => {
  await requireRole(event, ['teacher', 'admin'])

  const body = await readBody(event)
  const { course_id, user_id, extra_score } = body

  if (!course_id || !user_id) {
    return cResp(null, 'Missing course_id or user_id parameter', false)
  }
  const numScore = Number(extra_score)
  if (isNaN(numScore)) {
    return cResp(null, 'Invalid extra_score', false)
  }

  const courseId = Number(course_id)
  const userId = Number(user_id)

  try {
    // upsert: update extra_score if record exists, otherwise insert a new record
    await db.insert(schema.userCourses)
      .values({
        userId,
        courseId,
        extraScore: String(numScore),
      })
      .onConflictDoUpdate({
        target: [schema.userCourses.userId, schema.userCourses.courseId],
        set: {
          extraScore: String(numScore),
        },
      })

    return cResp({ success: true, extraScore: numScore })
  } catch (error: any) {
    console.error('Failed to save extra score:', error)
    return cResp(null, error.message || 'Failed to save extra score', false)
  }
})
