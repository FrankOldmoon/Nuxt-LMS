/**
 * Chapter-class open access control
 * GET  /api/chapters/classes?chapterId=1  → Get the class open-state list for this chapter
 * POST /api/chapters/classes              → See classes.post.ts
 *
 * Only teachers/admins can operate
 */
import { db, schema } from '@nuxthub/db'
import { eq } from 'drizzle-orm'

export default eventHandler(async (event) => {
  const user = await requireAuth(event)

  const chapterId = Number(getQuery(event).chapterId)
  if (!chapterId) return cResp(null, 'Missing chapterId', false)

  // Query the course the chapter belongs to for permission check
  const chapter = await db
    .select({ courseId: schema.chapters.courseId })
    .from(schema.chapters)
    .where(eq(schema.chapters.id, chapterId))
    .limit(1)
  if (!chapter[0]) return cResp(null, 'Chapter not found', false)

  const canEdit = user.roles.includes('admin') || await isCourseTeacher(user.id, chapter[0].courseId)
  if (!canEdit) return cResp(null, 'No permission', false)

  // Get all classes + the class_chapter open state for this chapter
  const allClasses = await db.select().from(schema.classes)
  const classChapters = await db
    .select()
    .from(schema.classChapters)
    .where(eq(schema.classChapters.chapterId, chapterId))

  const openMap = new Map(classChapters.map(cc => [cc.classId, cc.open]))
  const result = allClasses.map(c => ({
    classId: c.id,
    name: c.name,
    open: openMap.get(c.id) ?? false,
  }))

  return cResp(result)
})
