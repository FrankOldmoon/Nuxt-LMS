/**
 * 轻量判分接口（不记分）
 * POST /api/questions/verify
 * body: { course_id, question_cid, user_answer }
 *
 * 供竞赛（race）等需要即时判定对错但不应记入成绩的场景使用。
 * 只返回 rate/isCorrect，不返回 answer/explanation（防暴力枚举答案）。
 * 响应与 /api/questions/submit 的判分逻辑完全一致（utils/submit/verify）。
 */
import { parseSubmitContext, SubmitContextError } from '../../utils/submit/context'
import { withSubmitHandler } from '../../utils/submit/handler'
import { verifyQuestionAnswer } from '../../utils/submit/verify'

export default withSubmitHandler('判分失败', async (event) => {
  const ctx = await parseSubmitContext(event, {
    cidField: 'question_cid',
    sectionKey: 'question',
  })
  const { courseId, cid: questionCid, body } = ctx

  const verified = await verifyQuestionAnswer(courseId, questionCid, body.user_answer)
  if (!verified) {
    throw new SubmitContextError('题目不存在或已删除')
  }
  return cResp({ rate: verified.rate, isCorrect: verified.isCorrect })
})
