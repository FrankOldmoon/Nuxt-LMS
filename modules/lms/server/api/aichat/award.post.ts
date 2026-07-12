import { db, schema } from "@nuxthub/db"
import { eq, and } from "drizzle-orm"
// addChapterScore / addCourseScore 通过 Nuxt auto-import 从 utils/userScore 引入（无需显式 import）

/**
 * AI 出题积分奖励接口
 * POST /api/aichat/award
 *
 * 与 /api/questions/submit 防刷策略一致：仅"首次作对"那一次发放经验与分数。
 * 因 AI 出题没有持久化 question_cid，使用 chapter_id 负值作为虚拟 questionCid 写入
 * userQuestions 表，依赖其主键 (userId, courseId, questionCid) 唯一性天然防刷。
 *
 * body: { course_id, chapter_id, correct_rate, point, ai_question_id }
 *   ai_question_id: 调用方提供的本轮 AI 题标识（同一题重做会因虚拟 cid 不同被识别为新题）
 *   强烈建议调用方使用稳定标识（如 AI 返回的题目 id 或 hash）；如不传则用 chapter_id。
 */
export default eventHandler(async (event) => {
  const user = await requireAuth(event)

  const body = await readBody(event)
  const { course_id, chapter_id, correct_rate, point, ai_question_id } = body

  if (!course_id) {
    return cResp(null, '缺少 course_id 参数', false)
  }

  const courseId = Number(course_id)
  const chapterId = Number(chapter_id) || 0
  const totalPoint = Number(point) || 0
  const rate = Number(correct_rate) || 0
  const isCorrect = rate > 0
  const score = Math.round(rate * totalPoint * 100) / 100

  // 虚拟 questionCid：负值 + chapter + ai_question_id 派生，避免与真实 question 冲突
  // 注：ai_question_id 缺失时退化为 chapterId，意味着同一 chapter 所有 AI 题共享"首次作对"
  // 限制——这是为防止恶意无标识刷分。生产环境调用方应传 ai_question_id 以允许每题独立首次作对奖励。
  const aiIdNum = ai_question_id ? Number(ai_question_id) : 0
  const questionCid = aiIdNum
    ? -100000000 - Math.abs(chapterId) * 100000 - Math.abs(aiIdNum)
    : -100000000 - Math.abs(chapterId) * 100000

  // 读取课程级 LMS 配置（用于经验值）
  const config = await getCourseLmsConfig(courseId)
  const qConfig = config.question

  try {
    // 查找是否已有该 AI 题的记录
    const existing = await db.query.userQuestions.findFirst({
      where: and(
        eq(schema.userQuestions.userId, user.id),
        eq(schema.userQuestions.courseId, courseId),
        eq(schema.userQuestions.questionCid, questionCid)
      )
    })

    // 计算经验值（仅首次提交给基础经验；首次答对额外给 correctBonusExp + firstCorrectBonusExp）
    let gainedExp = 0
    if (!existing) {
      gainedExp = qConfig.submitExp
      if (isCorrect) {
        gainedExp += qConfig.correctBonusExp + qConfig.firstCorrectBonusExp
      }
    }

    // 计算分数增量（仅"首次作对"那一次计分）
    const wasFirstRight = existing?.firstRight ? true : false
    const scoreDelta = (isCorrect && !wasFirstRight) ? score : 0

    // 写 userQuestions（持久化首次作对标记）
    if (existing) {
      await db.update(schema.userQuestions).set({
        score: String(Math.max(Number(existing.score) || 0, score)),
        correctRate: String(rate),
        firstRight: (existing.firstRight || isCorrect),
      }).where(and(
        eq(schema.userQuestions.userId, user.id),
        eq(schema.userQuestions.courseId, courseId),
        eq(schema.userQuestions.questionCid, questionCid)
      ))
    } else {
      await db.insert(schema.userQuestions).values({
        userId: user.id,
        courseId,
        questionCid,
        score: String(score),
        firstRight: isCorrect,
        correctRate: String(rate),
        submitCount: 1,
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
    console.error('AI 出题积分奖励失败:', error)
    return cResp(null, error.message || '积分奖励失败', false)
  }
})
