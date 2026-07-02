import { db, schema } from "@nuxthub/db"
import { eq, and } from "drizzle-orm"

export default eventHandler(async (event) => {
  const user = await requireAuth(event)

  const body = await readBody(event)
  const { course_id, question_cid, user_answer, correct_rate, point } = body

  if (!course_id || !question_cid) {
    return cResp(null, '缺少 course_id 或 question_cid 参数', false)
  }

  const courseId = Number(course_id)
  const questionCid = Number(question_cid)
  const totalPoint = Number(point) || 0
  const rate = Number(correct_rate) || 0
  const isCorrect = rate > 0
  const score = Math.round(rate * totalPoint * 100) / 100

  try {
    // 查找是否已有提交记录
    const existing = await db.query.userQuestions.findFirst({
      where: and(
        eq(schema.userQuestions.userId, user.id),
        eq(schema.userQuestions.courseId, courseId),
        eq(schema.userQuestions.questionCid, questionCid)
      )
    })

    if (existing) {
      // 已有记录：追加到 records，更新统计
      const records = user_answer
      const submitCount = (existing.submitCount || 0) + 1
      const wrongCount = isCorrect ? (existing.wrongCount || 0) : (existing.wrongCount || 0) + 1

      const result = await db.update(schema.userQuestions).set({
        records,
        score: String(score),
        submitCount,
        wrongCount,
        correctRate: String(rate),
      }).where(and(
        eq(schema.userQuestions.userId, user.id),
        eq(schema.userQuestions.courseId, courseId),
        eq(schema.userQuestions.questionCid, questionCid)
      )).returning()
      return cResp(result[0])
    } else {
      // 新记录：插入
      const result = await db.insert(schema.userQuestions).values({
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
      }).returning()
      return cResp(result[0])
    }
  } catch (error: any) {
    console.error('提交题目失败:', error)
    return cResp(null, error.statusMessage || '提交失败', false)
  }
})
