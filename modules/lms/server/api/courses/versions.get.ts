export default eventHandler(async (event) => {
  const id = requireQueryId(event)
  if (!id) {
    return cResp(null, '缺少 id 参数', false)
  }

  await requireCourseTeacher(event, id)
  const versions = await listContentVersions('course', id)
  return cResp(versions)
})
