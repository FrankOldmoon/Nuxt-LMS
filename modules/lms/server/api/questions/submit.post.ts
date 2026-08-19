/**
 * 题目提交
 * POST /api/questions/submit
 * body: { course_id, chapter_id?, question_cid, user_answer, correct_rate, point }
 *
 * 判分安全：correct_rate 与 point 不信任客户端。
 *  - 服务端从 questions 表加载题目定义（answer/type/point），根据 user_answer 重算得分比
 *  - html/evaluation/oj/video 等客户端判定型题型，rate 以客户端为准但 clamp 到 [0,1]
 *  - 分值一律取 DB 中题目自带的 point
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
import { parseSubmitContext, SubmitContextError } from '../../utils/submit/context'
import { notifyCourseProgress } from '../../utils/submit/progress'
import { withSubmitHandler } from '../../utils/submit/handler'
import { upsertUserQuestion } from '../../utils/submit/questions/upsert'
import { calcQuestionGainedExp, calcQuestionGainedCoin } from '../../utils/submit/questions/calc'
import { verifyQuestionAnswer } from '../../utils/submit/verify'

export default withSubmitHandler('提交题目失败', async (event) => {
  const ctx = await parseSubmitContext(event, {
    cidField: 'question_cid',
    sectionKey: 'question',
  })
  const { user, courseId, cid: questionCid, section: qConfig, body } = ctx

  // 兼容 chapter_id（用于更新 userChapters.score）
  const chapterId = Number(body.chapter_id) || 0

  // 服务端判分：不信任客户端 correct_rate / point
  const verified = await verifyQuestionAnswer(courseId, questionCid, body.user_answer)
  if (!verified) {
    throw new SubmitContextError('题目不存在或已删除')
  }
  const { rate, point: totalPoint, isCorrect } = verified
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

  // 2. 计算经验值 + 金币
  const gainedExp = calcQuestionGainedExp({
    qConfig,
    isCorrect,
    isFirstSubmit: !existing,
    newSubmitCount,
  })
  const gainedCoin = calcQuestionGainedCoin({
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
    coin: gainedCoin,
  })

  // 4. 向班级房间广播 danmaku（fire-and-forget，不影响响应）
  void broadcastSubmitDanmaku({
    userId: user.id,
    kind: 'question',
    isCorrect,
    gainedExp,
    gainedCoin,
  })

  return cResp({ gainedExp, gainedCoin, score, scoreDelta })
})
