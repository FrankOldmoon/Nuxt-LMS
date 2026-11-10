/**
 * 搜索用户（按用户名或姓名模糊匹配）
 *
 * M3 安全加固：仅允许教师/管理员调用，防止任意登录用户（含学生）枚举全部账号。
 * 返回字段仅含 id / username / name / avatarImg（不返回邮箱等敏感信息）。
 */
export default eventHandler(async (event) => {
  await requireTeacherOrObserver(event)

  const keyword = String(getQuery(event).keyword || '').trim()
  if (!keyword) {
    return cResp([])
  }

  const users = await searchUsers(keyword, 50)
  return cResp(users)
})
