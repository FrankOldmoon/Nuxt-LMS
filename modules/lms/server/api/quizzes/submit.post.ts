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
import { and, eq, inArray } from 'drizzle-orm'
import { calcQuizScore, calcQuizExp, calcQuizCoin } from '../../utils/quizSubmit/score'
import { handleQuizStartOnly } from '../../utils/quizSubmit/startOnly'
import { insertUserQuiz, updateUserQuizBestScore, incrementQuizSubmitCount } from '../../utils/quizSubmit/persist'
import { notifyCourseProgressMax, notifyParentCourse } from '../../utils/submit/progress'
import { computeServerRate } from '../../utils/submit/verify'

/**
 * 超时宽限（秒）：客户端到点会自动提交，但网络往返/渲染有延迟，
 * 服务端判定超时时留出宽限，避免"刚好到点提交"被误判作废。
 */
const SUBMIT_TIME_GRACE = 30

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
  if (!quiz) return cResp(null, '测验不存在', false, 'quiz_not_found')

  // 2.5 开放时间校验（start_only 与正常提交都生效，与前端 canStart 对齐）
  const nowTs = new Date()
  if (quiz.startAt && nowTs < new Date(quiz.startAt)) {
    return cResp(null, '测验尚未开始', false, 'quiz_not_started')
  }
  if (quiz.endAt && nowTs > new Date(quiz.endAt)) {
    return cResp(null, '测验已结束', false, 'quiz_ended')
  }

  // 3. 查找已有记录
  const existing = await db.query.userQuizzes.findFirst({
    where: and(
      eq(schema.userQuizzes.userId, user.id),
      eq(schema.userQuizzes.courseId, courseId),
      eq(schema.userQuizzes.quizCid, quizCid),
    ),
  })

  const timeLimit = Number(quiz.timeLimit) || 0

  // 3. start_only 模式
  if (start_only) {
    const r = await handleQuizStartOnly(user.id, courseId, quizCid, existing, undefined, timeLimit)
    return cResp({ startedAt: r.startedAt })
  }

  // 4. 提交次数限制
  const submitLimit = quiz.submitLimit || 1
  const currentCount = existing?.submitCount || 0
  if (currentCount >= submitLimit) {
    return cResp(null, '已达到最大提交次数', false, 'quiz_submit_limit')
  }

  // 4.5 答题时长校验：仅针对"进行中"的记录（startedAt 存在且未提交），
  // 防止超过时限后仍继续作答并补交。超时后该次作答作废，前端据此停止重试。
  if (existing?.startedAt && !existing.submitedAt && timeLimit > 0) {
    const elapsed = (nowTs.getTime() - new Date(existing.startedAt).getTime()) / 1000
    if (elapsed > timeLimit + SUBMIT_TIME_GRACE) {
      return cResp(null, '答题时间已结束', false, 'quiz_time_up')
    }
  }

  // 5. 服务端判分：按测验题目定义重算每题 rate（不信任客户端 rate/point）
  const quizQids: number[] = (Array.isArray(quiz.questions) ? quiz.questions : [])
    .map((item: any) => Number(typeof item === 'number' ? item : item?.id))
    .filter(Boolean)
  const quizQuestions = quizQids.length
    ? await db.query.questions.findMany({
        where: and(
          eq(schema.questions.courseId, courseId),
          inArray(schema.questions.cid, quizQids),
        ),
      })
    : []
  const questionMap = new Map(quizQuestions.map(q => [Number(q.cid), q]))
  // 测验内每题的配置分值（优先于 questions 表自身的 point，同一题可在不同测验配不同分值）
  const quizPointMap = new Map(
    (Array.isArray(quiz.questions) ? quiz.questions : [])
      .filter((q: any) => q && typeof q === 'object')
      .map((q: any) => [Number(q.id), Number(q.point) || 0]),
  )

  const verifiedRecords = (Array.isArray(records) ? records : [])
    .filter((r: any) => r && questionMap.has(Number(r.questionCid)))
    .map((r: any) => {
      const q = questionMap.get(Number(r.questionCid))!
      const rate = computeServerRate(q, r.answer)
      // 分值优先用测验内配置，未配置时回退 questions 表分值
      const point = quizPointMap.get(Number(r.questionCid)) || Number(q.point) || 0
      return { questionCid: Number(r.questionCid), answer: r.answer ?? [], rate, point }
    })

  // 6. 计算分数 + 经验
  const { totalScore, correctCount } = calcQuizScore(verifiedRecords)
  const config = await getCourseLmsConfig(courseId)
  const qConfig = config.quiz
  const existingBestScore = existing ? Number(existing.score) || 0 : null
  const gainedExp = calcQuizExp({ qConfig, totalScore, existingBestScore })
  const gainedCoin = calcQuizCoin({ qConfig, totalScore, existingBestScore })
  const isPassed = totalScore >= (qConfig.passScore || 60)
  const newSubmitCount = currentCount + 1
  const now = new Date()

  // 7. 写 userQuizzes（取最高分，records 存服务端重算后的每题结果）
  if (existing) {
    const bestScore = Math.max(existingBestScore!, totalScore)
    await updateUserQuizBestScore({
      userId: user.id, courseId, quizCid, records: verifiedRecords,
      bestScore, totalScore, existingScore: existingBestScore!,
      newSubmitCount, existingStartedAt: existing.startedAt, now,
    })
  } else {
    await insertUserQuiz({ userId: user.id, courseId, quizCid, records: verifiedRecords, totalScore, now })
  }

  // 7. 更新 userCourses.quizScore（最高分模式）+ 奖章
  const finalScore = existing ? Math.max(existingBestScore!, totalScore) : totalScore
  await notifyCourseProgressMax({
    userId: user.id,
    courseId,
    score: finalScore,
    scoreKey: 'quizScore',
    exp: gainedExp,
    coin: gainedCoin,
  })

  // 7.25 测验提交章节分（可调参数 quiz.chapterScore）
  const chapterId = Number(body.chapter_id) || 0
  const quizChapterScore = Number(qConfig.chapterScore) || 0
  if (chapterId && quizChapterScore > 0) {
    await addChapterScore(user.id, chapterId, quizChapterScore)
  }

  // 7.5 被其他课程 iframe 嵌入时，将相同加分镜像给宿主课程
  const parentCourseId = Number(body.parent_course_id) || 0
  if (parentCourseId && parentCourseId !== courseId) {
    await notifyParentCourse({
      userId: user.id,
      parentCourseId,
      selfCourseId: courseId,
      score: finalScore,
      scoreKey: 'quizScore',
      exp: gainedExp,
      coin: gainedCoin,
      mode: 'max',
    })
  }

  // 8. 更新测验全局计数
  await incrementQuizSubmitCount(courseId, quizCid, quiz.submitCount)

  // 9. 向班级房间广播 danmaku（fire-and-forget，不影响响应）
  void broadcastSubmitDanmaku({
    userId: user.id,
    kind: 'quiz',
    score: totalScore,
    isPassed,
    gainedExp,
    gainedCoin,
  })

  return cResp({ gainedExp, gainedCoin, score: totalScore, correctCount, isPassed, submitCount: newSubmitCount, records: verifiedRecords })
})
