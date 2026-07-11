import { db, schema } from "@nuxthub/db"
import { eq, and } from "drizzle-orm"

export default eventHandler(async (event) => {
  const user = await requireAuth(event)

  const body = await readBody(event)
  const { course_id, quiz_cid, records, start_only } = body

  if (!course_id || !quiz_cid) {
    return cResp(null, '缺少 course_id 或 quiz_cid 参数', false)
  }

  const courseId = Number(course_id)
  const quizCid = Number(quiz_cid)

  // 获取测验配置
  const quiz = await db.query.quizzes.findFirst({
    where: and(
      eq(schema.quizzes.courseId, courseId),
      eq(schema.quizzes.cid, quizCid)
    )
  })
  if (!quiz) {
    return cResp(null, '测验不存在', false)
  }

  // 查找已有记录
  const existing = await db.query.userQuizzes.findFirst({
    where: and(
      eq(schema.userQuizzes.userId, user.id),
      eq(schema.userQuizzes.courseId, courseId),
      eq(schema.userQuizzes.quizCid, quizCid)
    )
  })

  const now = new Date()

  // start_only 模式：只记录开始时间，不计算分数
  if (start_only) {
    if (existing && !existing.submitedAt) {
      // 已有进行中记录，不覆盖 startedAt
      return cResp({ startedAt: existing.startedAt })
    }
    if (existing) {
      // 已提交过，更新为重新开始
      await db.update(schema.userQuizzes).set({
        startedAt: now,
        submitedAt: null,
        records: [],
      }).where(and(
        eq(schema.userQuizzes.userId, user.id),
        eq(schema.userQuizzes.courseId, courseId),
        eq(schema.userQuizzes.quizCid, quizCid)
      ))
    } else {
      // 新建进行中记录
      await db.insert(schema.userQuizzes).values({
        userId: user.id,
        courseId,
        quizCid,
        records: [],
        score: '0',
        submitCount: 0,
        startedAt: now,
        submitedAt: null,
      })
    }
    return cResp({ startedAt: now })
  }

  // 检查提交次数限制
  const submitLimit = quiz.submitLimit || 1
  const currentCount = existing?.submitCount || 0
  if (currentCount >= submitLimit) {
    return cResp(null, '已达到最大提交次数', false)
  }

  // 计算分数：records 是 [{ questionCid, rate, point, answer }]
  let totalScore = 0
  let correctCount = 0

  if (Array.isArray(records)) {
    for (const r of records) {
      const rate = Number(r.rate) || 0
      const qPoint = Number(r.point) || 0
      totalScore += Math.round(rate * qPoint * 100) / 100
      if (rate > 0) correctCount++
    }
  }
  totalScore = Math.round(totalScore * 100) / 100

  // 读取 LMS 配置
  const config = await getCourseLmsConfig(courseId)
  const qConfig = config.quiz
  const passScore = qConfig.passScore || 60
  const isPassed = totalScore >= passScore
  // 是否已经及格过（已有记录且最高分达到及格线）
  const alreadyPassed = !!(existing && (Number(existing.score) || 0) >= passScore)

  let gainedExp = qConfig.submitExp
  // passBonusExp 仅首次及格时发放，已及格过的测验再次提交不再给
  if (isPassed && !alreadyPassed) gainedExp += qConfig.passBonusExp

  const newSubmitCount = currentCount + 1

  if (existing) {
    // 更新：取最高分
    const prevScore = Number(existing.score) || 0
    const bestScore = Math.max(prevScore, totalScore)
    await db.update(schema.userQuizzes).set({
      records,
      score: String(bestScore),
      submitCount: newSubmitCount,
      startedAt: existing.startedAt,
      submitedAt: now,
    }).where(and(
      eq(schema.userQuizzes.userId, user.id),
      eq(schema.userQuizzes.courseId, courseId),
      eq(schema.userQuizzes.quizCid, quizCid)
    ))
    // 经验只给比上次更好的
    if (totalScore > prevScore) {
      await addCourseScore(user.id, courseId, totalScore - prevScore, 'quizScore', gainedExp)
    }
  } else {
    await db.insert(schema.userQuizzes).values({
      userId: user.id,
      courseId,
      quizCid,
      records,
      score: String(totalScore),
      submitCount: 1,
      startedAt: now,
      submitedAt: now,
    })
    await addCourseScore(user.id, courseId, totalScore, 'quizScore', gainedExp)
  }

  // 更新测验提交计数
  await db.update(schema.quizzes).set({
    submitCount: (quiz.submitCount || 0) + 1,
  }).where(and(
    eq(schema.quizzes.courseId, courseId),
    eq(schema.quizzes.cid, quizCid)
  ))

  // 检查并授予奖章
  await checkAndAwardMedals(user.id, courseId)

  return cResp({ gainedExp, score: totalScore, correctCount, isPassed, submitCount: newSubmitCount })
})
