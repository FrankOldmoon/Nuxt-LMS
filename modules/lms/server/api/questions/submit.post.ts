/**
 * 题目提交
 * POST /api/questions/submit
 * body: { course_id, chapter_id?, question_cid, user_answer, correct_rate, point }
 *
 * 防刷策略（详见 utils/submit/questions.ts）：
 *  - 仅首次提交（无论对错）给基础经验
 *  - 首次答对额外给 correctBonusExp + firstCorrectBonusExp
 *  - 仅"首次作对"那一次计入 questionScore 增量
 *  - 超过 maxSubmitCount 后 gainedExp=0
 *
 * 注：addChapterScore / addCourseScore / checkAndAwardMedals / getCourseLmsConfig 通过 Nuxt auto-import 引入
 *     （不显式 import），让测试可通过 globalThis 注入 mock。
 */
import { parseSubmitContext } from '../../utils/submit/context'
import { notifyCourseProgress } from '../../utils/submit/progress'
import { withSubmitHandler } from '../../utils/submit/handler'
import { upsertUserQuestion } from '../../utils/submit/questions/upsert'
import { calcQuestionGainedExp } from '../../utils/submit/questions/calc'

export default withSubmitHandler('提交题目失败', async (event) => {
  const ctx = await parseSubmitContext(event, {
    cidField: 'question_cid',
    sectionKey: 'question',
  })
  const { user, courseId, cid: questionCid, section: qConfig, body } = ctx

  // 兼容 chapter_id（用于更新 userChapters.score）
  const chapterId = Number(body.chapter_id) || 0
  const totalPoint = Number(body.point) || 0
  const rate = Number(body.correct_rate) || 0
  const isCorrect = rate > 0
  const score = Math.round(rate * totalPoint * 100) / 100

  // 1. 写 userQuestions（防刷由 upsertUserQuestion 内部处理）
  const { existing, newSubmitCount, scoreDelta } = await upsertUserQuestion({
    userId: user.id,
    courseId,
    questionCid,
    rate,
    score,
    isCorrect,
    records: body.user_answer,
    trackWrongCount: true,
    trackSubmitCount: true,
  })

  // 2. 计算经验值
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
