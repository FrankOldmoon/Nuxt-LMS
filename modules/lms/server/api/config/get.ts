/**
 * Get the LMS configuration
 * Without course_id: returns the global configuration
 * With course_id: returns the merged course-level configuration (global + course overrides)
 */
export default eventHandler(async (event) => {
  await requireRole(event, ['teacher', 'admin'])

  const { course_id } = getQuery(event)

  if (course_id) {
    const config = await getCourseLmsConfig(Number(course_id))
    return cResp(config)
  }

  return cResp(getLmsConfigSync())
})
