/**
 * AI question score reward endpoint
 * POST /api/aichat/award
 *
 * Anti-abuse strategy is consistent with /api/questions/submit: only the "first correct" submission grants exp and score.
 * Because AI questions do not have a persisted question_cid, the negative value of chapter_id is used as a virtual questionCid
 * to write into the userQuestions table, relying on the natural uniqueness of its primary key (userId, courseId, questionCid) for anti-abuse.
 *
 * body: { course_id, chapter_id, correct_rate, point, ai_question_id }
 *   ai_question_id: the AI question identifier provided by the caller for this round (redoing the same question will be recognized as a new question due to different virtual cid)
 *   It is strongly recommended that the caller use a stable identifier (e.g. the question id or hash returned by AI); if not provided, chapter_id is used.
 *
 * Note: addChapterScore / addCourseScore / checkAndAwardMedals / getCourseLmsConfig are introduced via Nuxt auto-import
 */
import { SubmitContextError } from '../../utils/submit/context'
import { notifyCourseProgress } from '../../utils/submit/progress'
import { withSubmitHandler } from '../../utils/submit/handler'
import { upsertUserQuestion } from '../../utils/submit/questions/upsert'
import { calcQuestionGainedExp, calcQuestionGainedCoin } from '../../utils/submit/questions/calc'

export default withSubmitHandler('Failed to reward AI question score', async (event) => {
  const user = await requireAuth(event)
  const body = await readBody(event)
  const { course_id, chapter_id, correct_rate, point, ai_question_id } = body

  if (!course_id) throw new SubmitContextError('Missing course_id parameter')
  const courseId = Number(course_id)
  const chapterId = Number(chapter_id) || 0
  const totalPoint = Number(point) || 0
  const rate = Number(correct_rate) || 0
  const isCorrect = rate > 0
  const score = Math.round(rate * totalPoint * 100) / 100

  // Virtual questionCid: derived from negative value + chapter + ai_question_id, to avoid conflict with real questions
  const aiIdNum = ai_question_id ? Number(ai_question_id) : 0
  const questionCid = aiIdNum
    ? -100000000 - Math.abs(chapterId) * 100000 - Math.abs(aiIdNum)
    : -100000000 - Math.abs(chapterId) * 100000

  // Read course LMS config
  const config = await getCourseLmsConfig(courseId)
  const qConfig = config.question

  // 1. Write userQuestions (do not track records / wrongCount / submitCount increments)
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

  // 2. Calculate exp + coin (consistent with questions/submit)
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

  return cResp({ gainedExp, gainedCoin, score, scoreDelta })
})
