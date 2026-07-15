

/**
 * Check and award medals to the current user
 * GET /api/medals/check?courseId=1
 * Returns an array of newly awarded medal IDs
 */
export default eventHandler(async (event) => {
  const user = await requireAuth(event)
  const courseId = Number(getQuery(event).courseId)
  if (!courseId) return cResp([])

  const newIds = await checkAndAwardMedals(user.id, courseId)
  return cResp(newIds)
})
