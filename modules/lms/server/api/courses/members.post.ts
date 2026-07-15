/**
 * Add or remove a course's teacher/editor
 * body: { courseId, userId, role: 'teacher'|'editor', action: 'add'|'remove' }
 *
 * Side effects:
 * - When action='add' and role='teacher', automatically assign the 'teacher' role to that user
 *   (ensures system-level permission is consistent with course-level identity; isCourseTeacher() requires either roles or teacherCourseIds)
 * - Do not reverse-remove the role on 'remove': a user may be a teacher in many courses, so removing them from one should not affect the system-level identity
 */
export default eventHandler(async (event) => {
  const body = await readBody(event)
  const { courseId, userId, role, action } = body

  if (!courseId || !userId || !role || !action) {
    return cResp(null, 'Missing parameters', false)
  }

  if (!['teacher', 'editor'].includes(role) || !['add', 'remove'].includes(action)) {
    return cResp(null, 'Invalid parameters', false)
  }

  await requireAdmin(event)

  try {
    await updateCourseMember(Number(courseId), Number(userId), role, action)

    // When set as course teacher, sync-assign the teacher role (idempotent; failure only warns, does not throw)
    if (action === 'add' && role === 'teacher') {
      await assignRoleToUser(Number(userId), 'teacher')
    }

    return cResp({ success: true })
  } catch (error: any) {
    console.error('Failed to update course member:', error)
    return cResp(null, error.message || 'Update failed', false)
  }
})
