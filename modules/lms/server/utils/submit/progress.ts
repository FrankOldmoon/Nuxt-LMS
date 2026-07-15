/**
 * Unified course progress update after submission
 *
 * All submit APIs (except some scenarios of aichat/award) need to do the following after writing userXxx:
 *   1. Update userCourses (sub-item + total score + exp + coin)
 *   2. Trigger medal check
 *
 * Merged into the two notifyCourseProgress* functions, to avoid business handlers missing calls or wrong order.
 *
 * Note: addCourseScore / addCourseScoreMax / checkAndAwardMedals are introduced via Nuxt auto-import
 *       (no explicit import), so tests can inject mocks via globalThis.
 */

/**
 * Accumulate mode: sub-item scoreKey accumulation + total score accumulation + exp + coin + medal check
 * @param scoreKey Sub-item field: questionScore / homeworkScore / quizScore / raceScore
 */
export async function notifyCourseProgress(args: {
  userId: number
  courseId: number
  score: number
  scoreKey: 'questionScore' | 'homeworkScore' | 'quizScore' | 'raceScore' | string
  exp: number
  coin?: number
}) {
  const { userId, courseId, score, scoreKey, exp, coin = 0 } = args
  if (!courseId) return { newMedalIds: [] as number[] }
  await addCourseScore(userId, courseId, score, scoreKey, exp, coin)
  const newMedalIds = await checkAndAwardMedals(userId, courseId)
  return { newMedalIds }
}

/**
 * Highest score mode: sub-item takes max (anti-abuse) + total score accumulates by difference + exp + coin + medal check
 */
export async function notifyCourseProgressMax(args: {
  userId: number
  courseId: number
  score: number
  scoreKey: 'questionScore' | 'homeworkScore' | 'quizScore' | 'raceScore' | string
  exp: number
  coin?: number
}) {
  const { userId, courseId, score, scoreKey, exp, coin = 0 } = args
  if (!courseId) return { newMedalIds: [] as number[] }
  await addCourseScoreMax(userId, courseId, score, scoreKey, exp, coin)
  const newMedalIds = await checkAndAwardMedals(userId, courseId)
  return { newMedalIds }
}
