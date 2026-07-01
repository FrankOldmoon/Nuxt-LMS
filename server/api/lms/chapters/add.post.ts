export default eventHandler(async (event) => {
  const body = await readBody(event)

  // 管理员或父课程的任课教师可新增章节
  if (body.courseId) {
    await requireCourseTeacher(event, Number(body.courseId))
  } else {
    await requireAdmin(event)
  }

  try {
    const result = await addTable('chapters', body)
    return cResp(result)
  } catch (error: any) {
    console.error('新增章节失败:', error)
    return cResp(null, error.statusMessage || '新增失败', false)
  }
})
