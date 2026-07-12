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
 *
 * 注：addChapterScore / addCourseScore / checkAndAwardMedals / getCourseLmsConfig 通过 Nuxt auto-import
 */
import { SubmitContextError } from '../../utils/submit/context'
import { notifyCourseProgress } from '../../utils/submit/progress'
import { withSubmitHandler } from '../../utils/submit/handler'
import { upsertUserQuestion } from '../../utils/submit/questions/upsert'
import { calcQuestionGainedExp } from '../../utils/submit/questions/calc'

export default withSubmitHandler('AI 出题积分奖励失败', async (event) => {
  const user = await requireAuth(event)
  const body = await readBody(event)
  const { course_id, chapter_id, correct_rate, point, ai_question_id } = body

  if (!course_id) throw new SubmitContextError('缺少 course_id 参数')
  const courseId = Number(course_id)
  const chapterId = Number(chapter_id) || 0
  const totalPoint = Number(point) || 0
  const rate = Number(correct_rate) || 0
  const isCorrect = rate > 0
  const score = Math.round(rate * totalPoint * 100) / 100

  // 虚拟 questionCid：负值 + chapter + ai_question_id 派生，避免与真实 question 冲突
  const aiIdNum = ai_question_id ? Number(ai_question_id) : 0
  const questionCid = aiIdNum
    ? -100000000 - Math.abs(chapterId) * 100000 - Math.abs(aiIdNum)
    : -100000000 - Math.abs(chapterId) * 100000

  // 读取课程 LMS 配置
  const config = await getCourseLmsConfig(courseId)
  const qConfig = config.question

  // 1. 写 userQuestions（不跟踪 records / wrongCount / submitCount 增量）
  const { existing, newSubmitCount, scoreDelta } = await upsertUserQuestion({
    userId: user.id,
    courseId,
    questionCid,
    rate,
    score,
    isCorrect,
    trackWrongCount: false,
    trackSubmitCount: false,
  })

  // 2. 计算经验值（与 questions/submit 一致）
  const gainedExp = calcQuestionGainedExp({
    qConfig,
    isCorrect,
    isFirstSubmit: !existing,
    newSubmitCount,
  })

  // 3. 更新 userChapters.score（仅首次作对时加）+ userCourses.questionScore
  if (scoreDelta > 0 && chapterId) {
    await addChapterScore(user.id, chapterId, scoreDelta)
  }
  await notifyCourseProgress({
    userId: user.id,
    courseId,
    score: scoreDelta,
    scoreKey: 'questionScore',
    exp: gainedExp,
  })

  return cResp({ gainedExp, score, scoreDelta })
})
