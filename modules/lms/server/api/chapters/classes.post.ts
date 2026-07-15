/**
 * Chapter-class open access control
 * POST /api/chapters/classes
 *   body: { chapterId, classes: [{ classId, open }] }
 *   batch upsert class_chapters.open
 *
 * Only teachers/admins can operate
 */
import { db, schema } from '@nuxthub/db'
import { eq, and } from 'drizzle-orm'

export default eventHandler(async (event) => {
  const user = await requireAuth(event)

  const body = await readBody(event)
  const { chapterId, classes } = body
  if (!chapterId || !Array.isArray(classes)) {
    return cResp(null, 'Missing chapterId or classes parameter', false)
  }

  // Permission check
  const chapter = await db
    .select({ courseId: schema.chapters.courseId })
    .from(schema.chapters)
    .where(eq(schema.chapters.id, Number(chapterId)))
    .limit(1)
  if (!chapter[0]) return cResp(null, 'Chapter not found', false)

  const canEdit = user.roles.includes('admin') || await isCourseTeacher(user.id, chapter[0].courseId)
  if (!canEdit) return cResp(null, 'No permission', false)

  // Upsert one by one
  for (const item of classes) {
    const existing = await db
      .select()
      .from(schema.classChapters)
      .where(and(
        eq(schema.classChapters.classId, Number(item.classId)),
        eq(schema.classChapters.chapterId, Number(chapterId)),
      ))
      .limit(1)

    if (existing[0]) {
      await db.update(schema.classChapters)
        .set({ open: !!item.open })
        .where(and(
          eq(schema.classChapters.classId, Number(item.classId)),
          eq(schema.classChapters.chapterId, Number(chapterId)),
        ))
    } else {
      await db.insert(schema.classChapters).values({
        classId: Number(item.classId),
        chapterId: Number(chapterId),
        open: !!item.open,
      })
    }
  }

  // After class open-state changes, notify relevant class students via WS to refresh access permissions
  const courseId = chapter[0].courseId
  const msg = JSON.stringify({
    type: 'chapterAccessUpdate',
    courseId,
    chapterId: Number(chapterId),
  })
  for (const item of classes) {
    broadcastToClass(Number(item.classId), msg)
  }

  return cResp({ success: true })
})
