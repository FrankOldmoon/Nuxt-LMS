import { db, schema } from '@nuxthub/db'
import { eq, and, count, sql } from 'drizzle-orm'
import type { UserMetrics } from './types'

/** 收集用户在某课程下的全部指标 */
export async function collectUserMetrics(userId: number, courseId: number): Promise<UserMetrics> {
  // userCourses 基础分数
  const uc = await db
    .select({
      score: schema.userCourses.score,
      exp: schema.userCourses.exp,
      questionScore: schema.userCourses.questionScore,
      homeworkScore: schema.userCourses.homeworkScore,
      commentScore: schema.userCourses.commentScore,
      quizScore: schema.userCourses.quizScore,
    })
    .from(schema.userCourses)
    .where(and(eq(schema.userCourses.userId, userId), eq(schema.userCourses.courseId, courseId)))
    .limit(1)

  const row: any = uc[0] || {}
  const exp = Number(row.exp) || 0
  // 等级公式：50*(l-1)*l <= exp → l = floor((1 + sqrt(1 + 8*exp/100)) / 2)
  const level = Math.max(1, Math.floor((1 + Math.sqrt(1 + (8 * exp) / 100)) / 2))

  // 做题数（userQuestions 按 userId + courseId）
  const qCount = await db
    .select({ c: count() })
    .from(schema.userQuestions)
    .where(and(eq(schema.userQuestions.userId, userId), eq(schema.userQuestions.courseId, courseId)))

  // 作业提交数
  const hCount = await db
    .select({ c: count() })
    .from(schema.userHomeworks)
    .where(and(eq(schema.userHomeworks.userId, userId), eq(schema.userHomeworks.courseId, courseId)))

  // 评论数
  const cCount = await db
    .select({ c: count() })
    .from(schema.userComments)
    .where(and(eq(schema.userComments.userId, userId), eq(schema.userComments.courseId, courseId)))

  // 章节通过数：先查该课程所有章节 id，再统计 userChapters.isPass
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
    questionCount: Number(qCount[0]?.c) || 0,
    homeworkCount: Number(hCount[0]?.c) || 0,
    commentCount: Number(cCount[0]?.c) || 0,
    chapterPassCount,
  }
}
