export default eventHandler(async (event) => {
  const id = requireQueryId(event)
  if (!id) {
    return cResp(null, '缺少 id 参数', false)
  }

  await requireChapterTeacher(event, id)
  const versions = await listContentVersions('chapter', id)
  return cResp(versions)
})
