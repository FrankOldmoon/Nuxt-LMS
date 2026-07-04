

/**
 * 检查并授予当前用户奖章
 * GET /api/lms/medals/check?courseId=1
 * 返回新授予的奖章 ID 数组
 */
export default eventHandler(async (event) => {
  const user = await requireAuth(event)
  const courseId = Number(getQuery(event).courseId)
  if (!courseId) return cResp([])

  const newIds = await checkAndAwardMedals(user.id, courseId)
  return cResp(newIds)
})
