import { addChapterScore, addCourseScore } from "../../utils/userScore"

/**
 * AI 出题积分奖励接口
 * POST /api/aichat/award
 *
 * 与 /api/questions/submit 不同：不写入 user_questions 记录，
 * 只更新 userChapters.score 与 userCourses 的 questionScore / exp。
 *
 * body: { course_id, chapter_id, correct_rate, point }
 */
export default eventHandler(async (event) => {
  const user = await requireAuth(event)

  const body = await readBody(event)
  const { course_id, chapter_id, correct_rate, point } = body

  if (!course_id) {
    return cResp(null, '缺少 course_id 参数', false)
  }

  const courseId = Number(course_id)
  const chapterId = Number(chapter_id) || 0
  const totalPoint = Number(point) || 0
  const rate = Number(correct_rate) || 0
  const isCorrect = rate > 0
  const score = Math.round(rate * totalPoint * 100) / 100

  // 读取课程级 LMS 配置（用于经验值）
  const config = await getCourseLmsConfig(courseId)
  const qConfig = config.question

  // 计算经验值（每次提交都有基础经验，答对额外加分；不区分首次）
  let gainedExp = qConfig.submitExp
  if (isCorrect) {
    gainedExp += qConfig.correctBonusExp
  }

  try {
    // 更新 userChapters.score
    if (score > 0) {
      await addChapterScore(user.id, chapterId, score)
    }

    // 更新 userCourses：questionScore + score + exp
    await addCourseScore(user.id, courseId, score, 'questionScore', gainedExp)

    // 检查并授予奖章
    await checkAndAwardMedals(user.id, courseId)

    return cResp({ gainedExp, score })
  } catch (error: any) {
    console.error('AI 出题积分奖励失败:', error)
    return cResp(null, error.statusMessage || '积分奖励失败', false)
  }
})
