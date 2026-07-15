/**
 * Quiz submission
 * POST /api/quizzes/submit
 * body: { course_id, quiz_cid, records, start_only? }
 *
 * Two modes:
 *  - start_only: only records the start time (does not calculate score)
 *  - Normal submission: calculate score + anti-abuse exp + write userQuizzes + update quiz.submitCount + check medals
 *
 * Exp anti-abuse (see utils/quizSubmit/score.calcQuizExp for details):
 *  - Submitting an already-passed quiz again: gainedExp=0
 *  - First pass: submitExp + passBonusExp
 *  - First non-pass: submitExp
 */
import { db, schema } from '@nuxthub/db'
import { and, eq } from 'drizzle-orm'
import { calcQuizScore, calcQuizExp, calcQuizCoin } from '../../utils/quizSubmit/score'
import { handleQuizStartOnly } from '../../utils/quizSubmit/startOnly'
import { insertUserQuiz, updateUserQuizBestScore, incrementQuizSubmitCount } from '../../utils/quizSubmit/persist'
import { notifyCourseProgressMax } from '../../utils/submit/progress'

export default eventHandler(async (event) => {
  const user = await requireAuth(event)
  const body = await readBody(event)
  const { course_id, quiz_cid, records, start_only } = body
  if (!course_id || !quiz_cid) {
    return cResp(null, 'Missing course_id or quiz_cid parameter', false)
  }
  const courseId = Number(course_id)
  const quizCid = Number(quiz_cid)

  // 1. Find quiz config
  const quiz = await db.query.quizzes.findFirst({
    where: and(eq(schema.quizzes.courseId, courseId), eq(schema.quizzes.cid, quizCid)),
  })
  if (!quiz) return cResp(null, 'Quiz does not exist', false)

  // 2. Find existing record
  const existing = await db.query.userQuizzes.findFirst({
    where: and(
      eq(schema.userQuizzes.userId, user.id),
      eq(schema.userQuizzes.courseId, courseId),
      eq(schema.userQuizzes.quizCid, quizCid),
    ),
  })

  // 3. start_only mode
  if (start_only) {
    const r = await handleQuizStartOnly(user.id, courseId, quizCid, existing)
    return cResp({ startedAt: r.startedAt })
  }

  // 4. Submit count limit
  const submitLimit = quiz.submitLimit || 1
  const currentCount = existing?.submitCount || 0
  if (currentCount >= submitLimit) {
    return cResp(null, 'Maximum number of submissions reached', false)
  }

  // 5. Calculate score + exp
  const { totalScore, correctCount } = calcQuizScore(records)
  const config = await getCourseLmsConfig(courseId)
  const qConfig = config.quiz
  const existingBestScore = existing ? Number(existing.score) || 0 : null
  const gainedExp = calcQuizExp({ qConfig, totalScore, existingBestScore })
  const gainedCoin = calcQuizCoin({ qConfig, totalScore, existingBestScore })
  const isPassed = totalScore >= (qConfig.passScore || 60)
  const newSubmitCount = currentCount + 1
  const now = new Date()

  // 6. Write userQuizzes (take the highest score)
  if (existing) {
    const bestScore = Math.max(existingBestScore!, totalScore)
    await updateUserQuizBestScore({
      userId: user.id, courseId, quizCid, records,
      bestScore, newSubmitCount, existingStartedAt: existing.startedAt, now,
    })
  } else {
    await insertUserQuiz({ userId: user.id, courseId, quizCid, records, totalScore, now })
  }

  // 7. Update userCourses.quizScore (highest score mode) + medals
  const finalScore = existing ? Math.max(existingBestScore!, totalScore) : totalScore
  await notifyCourseProgressMax({
    userId: user.id,
    courseId,
    score: finalScore,
    scoreKey: 'quizScore',
    exp: gainedExp,
    coin: gainedCoin,
  })

  // 8. Update quiz global count
  await incrementQuizSubmitCount(courseId, quizCid, quiz.submitCount)

  // 9. Broadcast danmaku to the class room (fire-and-forget, does not affect response)
  void broadcastSubmitDanmaku({
    userId: user.id,
    kind: 'quiz',
    score: totalScore,
    isPassed,
    gainedExp,
    gainedCoin,
  })

  return cResp({ gainedExp, gainedCoin, score: totalScore, correctCount, isPassed, submitCount: newSubmitCount })
})
