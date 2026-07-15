import { db, schema } from '@nuxthub/db'
import { eq, and, count, sql } from 'drizzle-orm'
import type { UserMetrics } from './types'

/** Collect all metrics for a user under a course */
export async function collectUserMetrics(userId: number, courseId: number): Promise<UserMetrics> {
  // userCourses base scores
  const uc = await db
    .select({
      score: schema.userCourses.score,
      exp: schema.userCourses.exp,
      questionScore: schema.userCourses.questionScore,
      homeworkScore: schema.userCourses.homeworkScore,
      commentScore: schema.userCourses.commentScore,
      quizScore: schema.userCourses.quizScore,
      raceScore: schema.userCourses.raceScore,
    })
    .from(schema.userCourses)
    .where(and(eq(schema.userCourses.userId, userId), eq(schema.userCourses.courseId, courseId)))
    .limit(1)

  const row: any = uc[0] || {}
  const exp = Number(row.exp) || 0
  // Level formula: 50*(l-1)*l <= exp -> l = floor((1 + sqrt(1 + 8*exp/100)) / 2)
  const level = Math.max(1, Math.floor((1 + Math.sqrt(1 + (8 * exp) / 100)) / 2))

  // Number of questions answered (userQuestions by userId + courseId)
  const qCount = await db
    .select({ c: count() })
    .from(schema.userQuestions)
    .where(and(eq(schema.userQuestions.userId, userId), eq(schema.userQuestions.courseId, courseId)))

  // Number of homework submissions
  const hCount = await db
    .select({ c: count() })
    .from(schema.userHomeworks)
    .where(and(eq(schema.userHomeworks.userId, userId), eq(schema.userHomeworks.courseId, courseId)))

  // Number of comments
  const cCount = await db
    .select({ c: count() })
    .from(schema.userComments)
    .where(and(eq(schema.userComments.userId, userId), eq(schema.userComments.courseId, courseId)))

  // Number of chapters passed: first get all chapter ids of the course, then count userChapters.isPass
  const chapterIds = await db
    .select({ id: schema.chapters.id })
    .from(schema.chapters)
    .where(eq(schema.chapters.courseId, courseId))
  let chapterPassCount = 0
  if (chapterIds.length > 0) {
    const passRows = await db
      .select({ c: count() })
      .from(schema.userChapters)
      .where(and(
        eq(schema.userChapters.userId, userId),
        eq(schema.userChapters.isPass, true),
        sql`${schema.userChapters.chapterId} IN (${sql.join(chapterIds.map(c => sql`${c.id}`), sql`,`)})`,
      ))
    chapterPassCount = Number(passRows[0]?.c) || 0
  }

  return {
    courseScore: Number(row.score) || 0,
    exp,
    level,
    questionScore: Number(row.questionScore) || 0,
    homeworkScore: Number(row.homeworkScore) || 0,
    commentScore: Number(row.commentScore) || 0,
    quizScore: Number(row.quizScore) || 0,
    raceScore: Number(row.raceScore) || 0,
    questionCount: Number(qCount[0]?.c) || 0,
    homeworkCount: Number(hCount[0]?.c) || 0,
    commentCount: Number(cCount[0]?.c) || 0,
    chapterPassCount,
  }
}
