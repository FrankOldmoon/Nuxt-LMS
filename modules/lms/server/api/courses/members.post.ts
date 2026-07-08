/**
 * 添加或移除课程的教师/编辑者
 * body: { courseId, userId, role: 'teacher'|'editor', action: 'add'|'remove' }
 *
 * 副作用：
 * - 当 action='add' 且 role='teacher' 时，自动给该用户加上 'teacher' 角色
 *   （确保系统级权限与课程级身份一致；isCourseTeacher() 依赖 roles 与 teacherCourseIds 任一即可）
 * - 不在 remove 时反向移除 role：用户在多课程下都可能是老师，单课程移除不应影响系统级身份
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

    // 设为课程教师时同步分配 teacher 角色（幂等，失败仅 warn 不抛错）
    if (action === 'add' && role === 'teacher') {
      await assignRoleToUser(Number(userId), 'teacher')
    }

    return cResp({ success: true })
  } catch (error: any) {
    console.error('更新课程成员失败:', error)
    return cResp(null, error.statusMessage || '更新失败', false)
  }
})
