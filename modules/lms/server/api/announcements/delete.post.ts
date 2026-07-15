/**
 * Delete an announcement
 * POST /api/announcements/delete
 * body: { id: number }
 *
 * Permission: course teacher / admin
 */
import { db, schema } from '@nuxthub/db'
import { eq } from 'drizzle-orm'

export default eventHandler(async (event) => {
  const user = await requireAuth(event)
  const { id } = await readBody(event)
  const annId = Number(id)
  if (!annId) return cResp(null, 'Missing id', false)

  const ann = await db.query.announcements.findFirst({
    where: eq(schema.announcements.id, annId),
  })
  if (!ann) return cResp(null, 'Announcement not found', false)

  const allowed = user.roles.includes('admin')
    || user.roles.includes('teacher')
    || (await isCourseTeacher(user.id, ann.courseId))
  if (!allowed) {
    return cResp(null, 'Only teachers and above can delete announcements', false)
  }

  await db.delete(schema.announcements).where(eq(schema.announcements.id, annId))
  return cResp({ deleted: 1 })
})
