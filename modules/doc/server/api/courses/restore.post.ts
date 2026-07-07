export default eventHandler(async (event) => {
  const body = await readBody(event)
  const { versionId } = body

  if (!versionId) {
    return cResp(null, '缺少 versionId 参数', false)
  }

  const version = await getContentVersion('course', Number(versionId))
  if (!version) {
    return cResp(null, '版本不存在', false)
  }

  const courseId = version.courseId
  await requireCourseTeacher(event, courseId)

  try {
    await restoreContentVersion('course', courseId, version.content)
    return cResp({ success: true })
  } catch (error: any) {
    console.error('恢复课程版本失败:', error)
    return cResp(null, error.statusMessage || '恢复失败', false)
  }
})
