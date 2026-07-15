/** Get the user list of a specified class (can include course number and group info) */
export default eventHandler(async (event) => {
  const { classId, course_id } = getQuery(event)
  const cid = Number(classId)
  if (!cid) {
    return cResp(null, 'Missing classId parameter', false)
  }

  const courseId = course_id ? Number(course_id) : 0
  const users = await getClassUsers(cid, courseId)
  return cResp(users)
})
