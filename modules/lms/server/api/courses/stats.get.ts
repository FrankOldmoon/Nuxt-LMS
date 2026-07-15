/**
 * Course learning statistics: returns the count of various learning activities for the specified user in this course
 * GET /api/courses/stats?courseId=1[&userId=2]
 *
 * - Without userId: returns the statistics of the currently logged-in user (displayed in the student-side "My Learning Data")
 * - With userId, and the current user is the course teacher / admin: returns the statistics of that userId (teacher viewing student learning status)
 * - With userId, but insufficient permissions: returns 403
 */
import { db, schema } from '@nuxthub/db'
import { eq, and, count } from 'drizzle-orm'

export default eventHandler(async (event) => {
  const user = await requireAuth(event)
  const courseId = Number(getQuery(event).courseId)
  if (!courseId) return cResp(null, 'Missing courseId', false)

  const queryUserId = Number(getQuery(event).userId) || 0
  let uid = user.id
  if (queryUserId && queryUserId !== user.id) {
    // Only course teacher / admin can query statistics of other users
    const isTeacher = await isCourseTeacher(user.id, courseId)
    if (!isTeacher && !user.roles?.includes('admin')) {
      throw createError({ statusCode: 403, statusMessage: 'No permission to view this student\'s statistics' })
    }
    uid = queryUserId
  }

  // Count of completed items per category (by user + course)
  const [q] = await db
    .select({ n: count() })
    .from(schema.userQuestions)
    .where(and(eq(schema.userQuestions.userId, uid), eq(schema.userQuestions.courseId, courseId)))

  const [h] = await db
    .select({ n: count() })
    .from(schema.userHomeworks)
    .where(and(eq(schema.userHomeworks.userId, uid), eq(schema.userHomeworks.courseId, courseId)))

  const [qz] = await db
    .select({ n: count() })
    .from(schema.userQuizzes)
    .where(and(eq(schema.userQuizzes.userId, uid), eq(schema.userQuizzes.courseId, courseId)))

  const [r] = await db
    .select({ n: count() })
    .from(schema.userRaces)
    .where(and(eq(schema.userRaces.userId, uid), eq(schema.userRaces.courseId, courseId)))

  const [c] = await db
    .select({ n: count() })
    .from(schema.comments)
    .where(and(eq(schema.comments.userId, uid), eq(schema.comments.courseId, courseId)))

  return cResp({
    questionCount: Number(q?.n) || 0,
    homeworkCount: Number(h?.n) || 0,
    quizCount: Number(qz?.n) || 0,
    raceCount: Number(r?.n) || 0,
    commentCount: Number(c?.n) || 0,
  })
})
