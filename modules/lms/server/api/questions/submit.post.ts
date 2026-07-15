/**
 * Question submission
 * POST /api/questions/submit
 * body: { course_id, chapter_id?, question_cid, user_answer, correct_rate, point }
 *
 * Anti-abuse strategy (see utils/submit/questions.ts for details):
 *  - Only the first submission (regardless of correctness) gives base exp
 *  - First correct answer additionally gives correctBonusExp + firstCorrectBonusExp
 *  - Only the "first correct" submission counts toward the questionScore increment
 *  - After exceeding maxSubmitCount, gainedExp=0
 *
 * Note: addChapterScore / addCourseScore / checkAndAwardMedals / getCourseLmsConfig are introduced via Nuxt auto-import
 *       (no explicit import), so tests can inject mocks via globalThis.
 */
import { parseSubmitContext } from '../../utils/submit/context'
import { notifyCourseProgress } from '../../utils/submit/progress'
import { withSubmitHandler } from '../../utils/submit/handler'
import { upsertUserQuestion } from '../../utils/submit/questions/upsert'
import { calcQuestionGainedExp, calcQuestionGainedCoin } from '../../utils/submit/questions/calc'

export default withSubmitHandler('Failed to submit question', async (event) => {
  const ctx = await parseSubmitContext(event, {
    cidField: 'question_cid',
    sectionKey: 'question',
  })
  const { user, courseId, cid: questionCid, section: qConfig, body } = ctx

  // Compatible with chapter_id (used to update userChapters.score)
  const chapterId = Number(body.chapter_id) || 0
  const totalPoint = Number(body.point) || 0
  const rate = Number(body.correct_rate) || 0
  const isCorrect = rate > 0
  const score = Math.round(rate * totalPoint * 100) / 100

  // 1. Write userQuestions (anti-abuse is handled inside upsertUserQuestion)
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

  // 2. Calculate exp + coin
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

  // 3. Update userChapters.score (only added on first correct) + userCourses.questionScore
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

  // 4. Broadcast danmaku to the class room (fire-and-forget, does not affect response)
  void broadcastSubmitDanmaku({
    userId: user.id,
    kind: 'question',
    isCorrect,
    gainedExp,
    gainedCoin,
  })

  return cResp({ gainedExp, gainedCoin, score, scoreDelta })
})
