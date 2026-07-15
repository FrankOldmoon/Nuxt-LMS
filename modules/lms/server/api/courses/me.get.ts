/**
 * Get the current logged-in user's total score, exp, and the score of the specified chapter in this course
 * GET /api/courses/me?courseId=1[&chapterId=2]
 *
 * Lightweight endpoint, dedicated to userCard and other positions that need real-time refresh of score/exp:
 * - No classId required, directly query userCourses by userId + courseId
 * - When chapterId is provided, also returns the score of that chapter (userChapters)
 * - Does not query task completion, convenient for high-frequency calls after answering questions/submitting homework
 */
import { db, schema } from '@nuxthub/db'
import { eq, and } from 'drizzle-orm'

export default eventHandler(async (event) => {
  const user = await requireAuth(event)
  const query = getQuery(event)
  const courseId = Number(query.courseId)
  const chapterId = Number(query.chapterId) || 0

  if (!courseId) {
    return cResp({ courseScore: 0, exp: 0, coin: 0, chapterScore: null })
  }

  // Course total score + exp
  const courseRows = await db
    .select({
      score: schema.userCourses.score,
      exp: schema.userCourses.exp,
      coin: schema.userCourses.coin,
    })
    .from(schema.userCourses)
    .where(and(
      eq(schema.userCourses.userId, user.id),
      eq(schema.userCourses.courseId, courseId),
    ))
    .limit(1)

  const courseRow = courseRows[0]

  // Chapter score (only returned when chapterId is specified)
  let chapterScore: number | null = null
  if (chapterId) {
    // Verify the chapter actually belongs to this course, to prevent unauthorized reading of chapter scores from other courses
    const chapter = await db
      .select({ id: schema.chapters.id })
      .from(schema.chapters)
      .where(and(
        eq(schema.chapters.id, chapterId),
        eq(schema.chapters.courseId, courseId),
      ))
      .limit(1)
    if (chapter[0]) {
      const chapterRows = await db
        .select({ score: schema.userChapters.score })
        .from(schema.userChapters)
        .where(and(
          eq(schema.userChapters.userId, user.id),
          eq(schema.userChapters.chapterId, chapterId),
        ))
        .limit(1)
      chapterScore = chapterRows[0] ? Number(chapterRows[0].score) || 0 : 0
    }
  }

  return cResp({
    courseScore: courseRow ? Number(courseRow.score) || 0 : 0,
    exp: courseRow ? Number(courseRow.exp) || 0 : 0,
    coin: courseRow ? Number(courseRow.coin) || 0 : 0,
    chapterScore,
  })
})
