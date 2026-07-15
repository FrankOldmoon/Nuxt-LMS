/**
 * Create chapter: set initial isOpen based on the course's lmsConfig.course.defaultChapterOpen
 * POST /api/chapters/add
 * body: { name, courseId, isOpen?, ... }
 */
import { db, schema } from '@nuxthub/db'
import { eq } from 'drizzle-orm'

export default eventHandler(async (event) => {
  const body = await readBody(event)

  // Admin or any teacher of the parent course can create a chapter
  if (body.courseId) {
    await requireCourseTeacher(event, Number(body.courseId))
  } else {
    await requireAdmin(event)
  }

  try {
    // Read the course's lmsConfig.course.defaultChapterOpen; if isOpen is not explicitly passed, use the merged default
    if (body.isOpen === undefined && body.courseId) {
      const course = await db
        .select({ config: schema.courses.config })
        .from(schema.courses)
        .where(eq(schema.courses.id, Number(body.courseId)))
        .limit(1)
      const cfg = (course[0]?.config as Record<string, any>) || {}
      const courseLms = mergeCourseLmsConfig(cfg)
      body.isOpen = courseLms?.course?.defaultChapterOpen ?? true
    }

    const result = await addTable('chapters', body)
    return cResp(result)
  } catch (error: any) {
    console.error('Failed to create chapter:', error)
    return cResp(null, error.message || 'Create failed', false)
  }
})
