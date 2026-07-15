export default eventHandler(async (event) => {
  const body = await readBody(event)
  const { versionId } = body

  if (!versionId) {
    return cResp(null, 'Missing versionId parameter', false)
  }

  const version = await getContentVersion('chapter', Number(versionId))
  if (!version) {
    return cResp(null, 'Version not found', false)
  }

  const chapterId = version.chapterId
  await requireChapterTeacher(event, chapterId)

  try {
    await restoreContentVersion('chapter', chapterId, version.content)
    return cResp({ success: true })
  } catch (error: any) {
    console.error('Failed to restore chapter version:', error)
    return cResp(null, error.message || 'Restore failed', false)
  }
})
