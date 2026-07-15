export default eventHandler(async (event) => {
  const id = requireQueryId(event)
  if (!id) {
    return cResp(null, 'Missing id parameter', false)
  }

  await requireChapterTeacher(event, id)
  const versions = await listContentVersions('chapter', id)
  return cResp(versions)
})
