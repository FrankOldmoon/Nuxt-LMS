/** 获取课程的教师和编辑者列表 */
export default eventHandler(async (event) => {
  const courseId = requireQueryId(event)
  if (!courseId) {
    return cResp(null, '缺少 id 参数', false)
  }

  await requireCourseTeacher(event, courseId)
  const members = await getCourseMembers(courseId)
  return cResp(members)
})
