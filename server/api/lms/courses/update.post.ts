export default eventHandler(async (event) => {
  const body = await readBody(event)
  const { id, ...setData } = body

  if (!id) {
    return cResp(null, '缺少 id 参数', false)
  }

  // 管理员或该课程的任课教师可更新
  await requireCourseTeacher(event, Number(id))

  try {
    const result = await updateTable('courses', Number(id), setData)
    return cResp(result)
  } catch (error: any) {
    console.error('更新课程失败:', error)
    return cResp(null, error.statusMessage || '更新失败', false)
  }
})
