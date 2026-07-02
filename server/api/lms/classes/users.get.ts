/** 获取指定班级的用户列表 */
export default eventHandler(async (event) => {
  const classId = Number(getQuery(event).classId)
  if (!classId) {
    return cResp(null, '缺少 classId 参数', false)
  }

  const users = await getClassUsers(classId)
  return cResp(users)
})
