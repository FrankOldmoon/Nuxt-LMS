/** Search users (fuzzy match by username or name), no selected course/class restriction */
export default eventHandler(async (event) => {
  await requireAuth(event)

  const keyword = String(getQuery(event).keyword || '').trim()
  if (!keyword) {
    return cResp([])
  }

  const users = await searchUsers(keyword, 50)
  return cResp(users)
})
