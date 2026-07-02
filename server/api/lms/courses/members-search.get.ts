/** 搜索用户（按用户名或姓名模糊匹配） */
export default eventHandler(async (event) => {
  const courseId = Number(getQuery(event).courseId)
  if (courseId) {
    await requireCourseTeacher(event, courseId)
  } else {
    await requireAuth(event)
  }

  const keyword = String(getQuery(event).keyword || '').trim()
  if (!keyword) {
    return cResp([])
  }

  const users = await searchUsers(keyword)
  return cResp(users)
})
