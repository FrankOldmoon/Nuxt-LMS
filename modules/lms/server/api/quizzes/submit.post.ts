/**
 * 测验提交
 * POST /api/quizzes/submit
 * body: { course_id, quiz_cid, records, start_only? }
 *
 * 两种模式：
 *  - start_only: 仅记录开始时间（不计算分数）
 *  - 正常提交: 计算分数 + 防刷发经验 + 写 userQuizzes + 更新 quiz.submitCount + 检查奖章
 *
 * 经验值防刷（详见 utils/quizSubmit/score.calcQuizExp）：
 *  - 已及格过的测验再次提交：gainedExp=0
 *  - 首次及格：submitExp + passBonusExp
 *  - 首次不及格：submitExp
 */
import { db, schema } from '@nuxthub/db'
import { and, eq } from 'drizzle-orm'
import { calcQuizScore, calcQuizExp } from '../../utils/quizSubmit/score'
import { handleQuizStartOnly } from '../../utils/quizSubmit/startOnly'
import { insertUserQuiz, updateUserQuizBestScore, incrementQuizSubmitCount } from '../../utils/quizSubmit/persist'
import { notifyCourseProgressMax } from '../../utils/submit/progress'

export default eventHandler(async (event) => {
  const user = await requireAuth(event)
  const body = await readBody(event)
  const { course_id, quiz_cid, records, start_only } = body
  if (!course_id || !quiz_cid) {
    return cResp(null, '缺少 course_id 或 quiz_cid 参数', false)
  }
  const courseId = Number(course_id)
  const quizCid = Number(quiz_cid)

  // 1. 查找测验配置
  const quiz = await db.query.quizzes.findFirst({
    where: and(eq(schema.quizzes.courseId, courseId), eq(schema.quizzes.cid, quizCid)),
  })
  if (!quiz) return cResp(null, '测验不存在', false)

  // 2. 查找已有记录
  const existing = await db.query.userQuizzes.findFirst({
    where: and(
      eq(schema.userQuizzes.userId, user.id),
      eq(schema.userQuizzes.courseId, courseId),
      eq(schema.userQuizzes.quizCid, quizCid),
    ),
  })

  // 3. start_only 模式
  if (start_only) {
    const r = await handleQuizStartOnly(user.id, courseId, quizCid, existing)
    return cResp({ startedAt: r.startedAt })
  }

  // 4. 提交次数限制
  const submitLimit = quiz.submitLimit || 1
  const currentCount = existing?.submitCount || 0
  if (currentCount >= submitLimit) {
    return cResp(null, '已达到最大提交次数', false)
  }

  // 5. 计算分数 + 经验
  const { totalScore, correctCount } = calcQuizScore(records)
  const config = await getCourseLmsConfig(courseId)
  const qConfig = config.quiz
  const existingBestScore = existing ? Number(existing.score) || 0 : null
  const gainedExp = calcQuizExp({ qConfig, totalScore, existingBestScore })
  const isPassed = totalScore >= (qConfig.passScore || 60)
  const newSubmitCount = currentCount + 1
  const now = new Date()

  // 6. 写 userQuizzes（取最高分）
  if (existing) {
    const bestScore = Math.max(existingBestScore!, totalScore)
    await updateUserQuizBestScore({
      userId: user.id, courseId, quizCid, records,
      bestScore, newSubmitCount, existingStartedAt: existing.startedAt, now,
    })
  } else {
    await insertUserQuiz({ userId: user.id, courseId, quizCid, records, totalScore, now })
  }

  // 7. 更新 userCourses.quizScore（最高分模式）+ 奖章
  const finalScore = existing ? Math.max(existingBestScore!, totalScore) : totalScore
  await notifyCourseProgressMax({
    userId: user.id,
    courseId,
    score: finalScore,
    scoreKey: 'quizScore',
    exp: gainedExp,
  })

  // 8. 更新测验全局计数
  await incrementQuizSubmitCount(courseId, quizCid, quiz.submitCount)

  return cResp({ gainedExp, score: totalScore, correctCount, isPassed, submitCount: newSubmitCount })
})
