export default eventHandler(async (event) => {
  const id = requireQueryId(event)
  if (!id) {
    return cResp(null, 'Missing id parameter', false)
  }

  await requireCourseTeacher(event, id)
  const versions = await listContentVersions('course', id)
  return cResp(versions)
})
