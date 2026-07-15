export default eventHandler(async (event) => {
  const body = await readBody(event)
  const { versionId } = body

  if (!versionId) {
    return cResp(null, 'Missing versionId parameter', false)
  }

  const version = await getContentVersion('course', Number(versionId))
  if (!version) {
    return cResp(null, 'Version not found', false)
  }

  const courseId = version.courseId
  await requireCourseTeacher(event, courseId)

  try {
    await restoreContentVersion('course', courseId, version.content)
    return cResp({ success: true })
  } catch (error: any) {
    console.error('Failed to restore course version:', error)
    return cResp(null, error.message || 'Restore failed', false)
  }
})
