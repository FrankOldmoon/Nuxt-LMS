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
    // 规则：仅首次提交（无论对错）给基础经验；首次答对额外给 correctBonusExp + firstCorrectBonusExp；
    // 一旦该题有过提交记录（existing 存在），后续任何提交都不再发放经验，彻底防刷。
    let gainedExp = 0
    if (!existing) {
      gainedExp = qConfig.submitExp
      if (isCorrect) {
        gainedExp += qConfig.correctBonusExp + qConfig.firstCorrectBonusExp
      }
    }
    const newSubmitCount = (existing?.submitCount || 0) + 1
    if (newSubmitCount > qConfig.maxSubmitCount) {
      gainedExp = 0
    }

    // 计算分数增量（仅"首次作对"那一次计分）
    // - existing 存在 && firstRight 已为 true：再次提交不加分
    // - existing 存在 && firstRight 为 false 且本次答对：算首次作对，加本次得分
    // - existing 不存在 && 本次答对：首次作对，加本次得分
    // - 本次答错：0
    let scoreDelta = 0
    const wasFirstRight = existing?.firstRight ? true : false
    if (isCorrect && !wasFirstRight) {
      scoreDelta = score
    }

    if (existing) {
      // 已有记录：更新
      const wrongCount = isCorrect ? (existing.wrongCount || 0) : (existing.wrongCount || 0) + 1
      await db.update(schema.userQuestions).set({
        records: user_answer,
        score: String(score),
        submitCount: newSubmitCount,
        wrongCount,
        correctRate: String(rate),
        firstRight: (existing.firstRight || isCorrect),
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
    return cResp(null, error.message || '提交失败', false)
  }
})
