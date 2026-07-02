/**
 * 添加或移除课程的教师/编辑者
 * body: { courseId, userId, role: 'teacher'|'editor', action: 'add'|'remove' }
 */
export default eventHandler(async (event) => {
  const body = await readBody(event)
  const { courseId, userId, role, action } = body

  if (!courseId || !userId || !role || !action) {
    return cResp(null, '缺少参数', false)
  }

  if (!['teacher', 'editor'].includes(role) || !['add', 'remove'].includes(action)) {
    return cResp(null, '参数无效', false)
  }

  await requireAdmin(event)

  try {
    await updateCourseMember(Number(courseId), Number(userId), role, action)
    return cResp({ success: true })
  } catch (error: any) {
    console.error('更新课程成员失败:', error)
    return cResp(null, error.statusMessage || '更新失败', false)
  }
})
