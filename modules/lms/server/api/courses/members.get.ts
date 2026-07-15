/** Get the list of teachers and editors for a course */
export default eventHandler(async (event) => {
  const courseId = requireQueryId(event)
  if (!courseId) {
    return cResp(null, 'Missing id parameter', false)
  }

  await requireCourseTeacher(event, courseId)
  const members = await getCourseMembers(courseId)
  return cResp(members)
})
