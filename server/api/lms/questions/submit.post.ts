import { db, schema } from "@nuxthub/db"
import { eq, and } from "drizzle-orm"

export default eventHandler(async (event) => {
  const user = await requireAuth(event)

  const body = await readBody(event)
  const { course_id, chapter_id, question_cid, user_answer, correct_rate, point } = body

  if (!course_id || !question_cid) {
    return cResp(null, '缺少 course_id 或 question_cid 参数', false)
  }

  const courseId = Number(course_id)
  const chapterId = Number(chapter_id) || 0
  const questionCid = Number(question_cid)
  const totalPoint = Number(point) || 0
  const rate = Number(correct_rate) || 0
  const isCorrect = rate > 0
  const score = Math.round(rate * totalPoint * 100) / 100

  // 读取课程级 LMS 配置
  const config = await getCourseLmsConfig(courseId)
  const qConfig = config.question

  try {
    // 查找是否已有提交记录
    const existing = await db.query.userQuestions.findFirst({
      where: and(
        eq(schema.userQuestions.userId, user.id),
        eq(schema.userQuestions.courseId, courseId),
        eq(schema.userQuestions.questionCid, questionCid)
      )
    })

    // 计算经验值
    let gainedExp = qConfig.submitExp
    if (isCorrect) {
      gainedExp += qConfig.correctBonusExp
      if (!existing?.firstRight) {
        gainedExp += qConfig.firstCorrectBonusExp
      }
    }
    const newSubmitCount = (existing?.submitCount || 0) + 1
    if (newSubmitCount > qConfig.maxSubmitCount) {
      gainedExp = 0
    }

    // 计算分数增量（只取比上次更好的分数）
    const prevScore = existing ? Number(existing.score) || 0 : 0
    const scoreDelta = Math.max(0, score - prevScore)

    if (existing) {
      // 已有记录：更新
      const wrongCount = isCorrect ? (existing.wrongCount || 0) : (existing.wrongCount || 0) + 1
      await db.update(schema.userQuestions).set({
        records: user_answer,
        score: String(score),
        submitCount: newSubmitCount,
        wrongCount,
        correctRate: String(rate),
      }).where(and(
        eq(schema.userQuestions.userId, user.id),
        eq(schema.userQuestions.courseId, courseId),
        eq(schema.userQuestions.questionCid, questionCid)
      )).returning()
    } else {
      // 新记录：插入
      await db.insert(schema.userQuestions).values({
        userId: user.id,
        courseId,
        questionCid,
        records: user_answer,
        score: String(score),
        submitCount: 1,
        wrongCount: isCorrect ? 0 : 1,
        firstRecord: user_answer,
        firstRight: isCorrect,
        correctRate: String(rate),
      })
    }

    // 更新 userChapters.score
    if (scoreDelta > 0) {
      await addChapterScore(user.id, chapterId, scoreDelta)
    }

    // 更新 userCourses：questionScore + score + exp
    await addCourseScore(user.id, courseId, scoreDelta, 'questionScore', gainedExp)

    // 检查并授予奖章
    await checkAndAwardMedals(user.id, courseId)

    return cResp({ gainedExp, score, scoreDelta })
  } catch (error: any) {
    console.error('提交题目失败:', error)
    return cResp(null, error.statusMessage || '提交失败', false)
  }
})
