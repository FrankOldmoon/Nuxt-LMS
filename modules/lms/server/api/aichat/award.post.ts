/**
 * AI 出题积分奖励接口
 * POST /api/aichat/award
 *
 * body: { course_id, chapter_id, correct_rate, point, ai_question_id }
 *
 * 防刷策略（AI 题为临时生成，无 DB 题目定义，无法服务端验证对错）：
 *  1. 不发放 firstCorrectBonus：客户端可伪造 ai_question_id 派生无限"首次"，
 *     故只给固定奖励（submit + correctBonus），与"是否首次"解耦
 *  2. 不计入课程总分/章节分：对错无法验证，AI 练习不参与排行榜计分
 *  3. 用户级频控：滑动窗口（每分钟）+ 每日上限，限制刷经验/金币总量
 *
 * 注：getCourseLmsConfig 通过 Nuxt auto-import 引入（不显式 import）
 */
import { SubmitContextError } from '../../utils/submit/context'
import { withSubmitHandler } from '../../utils/submit/handler'
import { upsertUserQuestion } from '../../utils/submit/questions/upsert'
import { notifyCourseProgress } from '../../utils/submit/progress'

// ====================== 频控（内存，单实例） ======================
const AWARD_WINDOW_MS = 60_000
const AWARD_MAX_PER_WINDOW = 6 // 每用户每分钟最多 6 次
const AWARD_MAX_PER_DAY = 50   // 每用户每天最多 50 次
const awardHits = new Map<number, number[]>()
const awardDaily = new Map<number, string>() // userId -> 最近计数的日期 key

function awardQuotaExceeded(userId: number): boolean {
  const now = Date.now()
  const dayKey = new Date().toISOString().slice(0, 10)
  // 滑动窗口
  const hits = (awardHits.get(userId) || []).filter(t => t > now - AWARD_WINDOW_MS)
  hits.push(now)
  awardHits.set(userId, hits)
  // 每日计数（跨天重置）
  const lastDay = awardDaily.get(userId)
  const daily = lastDay === dayKey ? hits.length : 0
  awardDaily.set(userId, dayKey)
  return hits.length > AWARD_MAX_PER_WINDOW || daily > AWARD_MAX_PER_DAY
}
// ================================================================

export default withSubmitHandler('AI 出题积分奖励失败', async (event) => {
  const user = await requireAuth(event)

  // 频控：防止伪造 ai_question_id 无限刷经验/金币
  if (awardQuotaExceeded(user.id)) {
    return cResp(null, '操作过于频繁，请稍后再试', false)
  }

  const body = await readBody(event)
  const { course_id, chapter_id, correct_rate, point, ai_question_id } = body

  if (!course_id) throw new SubmitContextError('缺少 course_id 参数')
  const courseId = Number(course_id)
  const chapterId = Number(chapter_id) || 0
  // rate/point 无法服务端复算：clamp 到 [0,1]，分值封顶
  const MAX_AI_AWARD_POINT = 10
  const rate = Math.max(0, Math.min(1, Number(correct_rate) || 0))
  const totalPoint = Math.max(0, Math.min(MAX_AI_AWARD_POINT, Number(point) || 0))
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

  // 1. 写 userQuestions（仅记录，不参与总分）
  await upsertUserQuestion({
    userId: user.id,
    courseId,
    questionCid,
    rate,
    score,
    isCorrect,
    trackWrongCount: false,
    trackSubmitCount: false,
  })

  // 2. 固定奖励：不依赖"首次"（AI 题首次无法验证），不给 firstCorrectBonus
  let gainedExp = 0
  let gainedCoin = 0
  if (isCorrect) {
    gainedExp = (Number(qConfig.submitExp) || 0) + (Number(qConfig.correctBonusExp) || 0)
    gainedCoin = (Number(qConfig.submitCoin) || 0) + (Number(qConfig.correctBonusCoin) || 0)
  }

  // 3. 只发经验/金币，不计入 questionScore / chapterScore（AI 题不参与排名）
  await notifyCourseProgress({
    userId: user.id,
    courseId,
    score: 0,
    scoreKey: 'questionScore',
    exp: gainedExp,
    coin: gainedCoin,
  })

  return cResp({ gainedExp, gainedCoin, score, scoreDelta: 0 })
})
