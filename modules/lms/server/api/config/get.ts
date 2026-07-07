/**
 * 获取 LMS 配置
 * 不传 course_id：返回全局配置
 * 传 course_id：返回合并后的课程级配置（全局 + 课程覆盖）
 */
export default eventHandler(async (event) => {
  await requireRole(event, ['teacher', 'admin'])

  const { course_id } = getQuery(event)

  if (course_id) {
    const config = await getCourseLmsConfig(Number(course_id))
    return cResp(config)
  }

  return cResp(getLmsConfigSync())
})
