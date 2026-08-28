/**
 * 提交后统一更新课程进度
 *
 * 所有 submit API（除 aichat/award 部分场景外）在写完 userXxx 后都需：
 *   1. 更新 userCourses（分项 + 总分 + 经验 + 金币）
 *   2. 触发奖章检查
 *
 * 合并为 notifyCourseProgress* 两个函数，避免业务 handler 漏调用或顺序错乱。
 *
 * 注：addCourseScore / addCourseScoreMax / checkAndAwardMedals 通过 Nuxt auto-import 引入
 *     （不显式 import），让测试可通过 globalThis 注入 mock。
 */

/**
 * 累加模式：分项 scoreKey 累加 + 总分累加 + 经验值 + 金币 + 奖章检查
 * @param scoreKey 分项字段：questionScore / homeworkScore / quizScore / raceScore
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
 * 将一笔提交的加分同时镜像给"宿主"课程（iframe 嵌套课程场景）。
 * 宿主课程与当前课程相同时跳过，避免重复累加。
 * @param mode 'acc' 累加模式（题目等）；'max' 最高分模式（测验/竞赛等）
 */
export async function notifyParentCourse(args: {
  userId: number
  parentCourseId: number
  selfCourseId: number
  score: number
  scoreKey: 'questionScore' | 'homeworkScore' | 'quizScore' | 'raceScore' | string
  exp: number
  coin?: number
  mode?: 'acc' | 'max'
}) {
  const { parentCourseId, selfCourseId } = args
  if (!parentCourseId || parentCourseId === selfCourseId) return
  if (args.mode === 'max') {
    return notifyCourseProgressMax({
      userId: args.userId,
      courseId: parentCourseId,
      score: args.score,
      scoreKey: args.scoreKey,
      exp: args.exp,
      coin: args.coin,
    })
  }
  return notifyCourseProgress({
    userId: args.userId,
    courseId: parentCourseId,
    score: args.score,
    scoreKey: args.scoreKey,
    exp: args.exp,
    coin: args.coin,
  })
}

/**
 * 最高分模式：分项取 max（防刷）+ 总分按差额累加 + 经验值 + 金币 + 奖章检查
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
