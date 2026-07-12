/**
 * 提交后统一更新课程进度
 *
 * 所有 submit API（除 aichat/award 部分场景外）在写完 userXxx 后都需：
 *   1. 更新 userCourses（分项 + 总分 + 经验）
 *   2. 触发奖章检查
 *
 * 合并为 notifyCourseProgress* 两个函数，避免业务 handler 漏调用或顺序错乱。
 *
 * 注：addCourseScore / addCourseScoreMax / checkAndAwardMedals 通过 Nuxt auto-import 引入
 *     （不显式 import），让测试可通过 globalThis 注入 mock。
 */

/**
 * 累加模式：分项 scoreKey 累加 + 总分累加 + 经验值 + 奖章检查
 * @param scoreKey 分项字段：questionScore / homeworkScore / quizScore / raceScore
 */
export async function notifyCourseProgress(args: {
  userId: number
  courseId: number
  score: number
  scoreKey: 'questionScore' | 'homeworkScore' | 'quizScore' | 'raceScore' | string
  exp: number
}) {
  const { userId, courseId, score, scoreKey, exp } = args
  if (!courseId) return { newMedalIds: [] as number[] }
  await addCourseScore(userId, courseId, score, scoreKey, exp)
  const newMedalIds = await checkAndAwardMedals(userId, courseId)
  return { newMedalIds }
}

/**
 * 最高分模式：分项取 max（防刷）+ 总分按差额累加 + 经验值 + 奖章检查
 */
export async function notifyCourseProgressMax(args: {
  userId: number
  courseId: number
  score: number
  scoreKey: 'questionScore' | 'homeworkScore' | 'quizScore' | 'raceScore' | string
  exp: number
}) {
  const { userId, courseId, score, scoreKey, exp } = args
  if (!courseId) return { newMedalIds: [] as number[] }
  await addCourseScoreMax(userId, courseId, score, scoreKey, exp)
  const newMedalIds = await checkAndAwardMedals(userId, courseId)
  return { newMedalIds }
}
