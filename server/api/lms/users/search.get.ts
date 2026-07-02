/** 搜索用户（按用户名或姓名模糊匹配），不含已选课程/班级限制 */
export default eventHandler(async (event) => {
  await requireAuth(event)

  const keyword = String(getQuery(event).keyword || '').trim()
  if (!keyword) {
    return cResp([])
  }

  const users = await searchUsers(keyword, 50)
  return cResp(users)
})
