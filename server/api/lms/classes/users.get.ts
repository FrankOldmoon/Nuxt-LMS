/** 获取指定班级的用户列表（可附带课程编号和分组信息） */
export default eventHandler(async (event) => {
  const { classId, course_id } = getQuery(event)
  const cid = Number(classId)
  if (!cid) {
    return cResp(null, '缺少 classId 参数', false)
  }

  const courseId = course_id ? Number(course_id) : 0
  const users = await getClassUsers(cid, courseId)
  return cResp(users)
})
