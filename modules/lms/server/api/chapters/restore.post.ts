export default eventHandler(async (event) => {
  const body = await readBody(event)
  const { versionId } = body

  if (!versionId) {
    return cResp(null, '缺少 versionId 参数', false)
  }

  const version = await getContentVersion('chapter', Number(versionId))
  if (!version) {
    return cResp(null, '版本不存在', false)
  }

  const chapterId = version.chapterId
  await requireChapterTeacher(event, chapterId)

  try {
    await restoreContentVersion('chapter', chapterId, version.content)
    return cResp({ success: true })
  } catch (error: any) {
    console.error('恢复章节版本失败:', error)
    return cResp(null, error.message || '恢复失败', false)
  }
})
