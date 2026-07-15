/**
 * Create an announcement
 * POST /api/announcements/add
 * body: { courseId, name, content?, classIds?: number[] }
 *
 * Permission: course teacher / admin
 *
 * Behavior:
 * - classIds empty / empty array -> create 1 record with classId = null (for everyone)
 * - classIds has N entries       -> create N records, one for each class
 */
import { db, schema } from '@nuxthub/db'
import { inArray } from 'drizzle-orm'

export default eventHandler(async (event) => {
  const user = await requireAuth(event)
  const body = await readBody(event)
  const courseId = Number(body?.courseId)
  const name = String(body?.name || '').trim()
  const content = body?.content ?? null
  const classIds: number[] = Array.isArray(body?.classIds)
    ? body.classIds.map((n: any) => Number(n)).filter((n: number) => Number.isFinite(n) && n > 0)
    : []

  if (!courseId) return cResp(null, 'Missing courseId', false)
  if (!name) return cResp(null, 'Missing name', false)

  // Permission: admin / system teacher / course teacher (including editors)
  const allowed = user.roles.includes('admin')
    || user.roles.includes('teacher')
    || (await isCourseTeacher(user.id, courseId))
  if (!allowed) {
    return cResp(null, 'Only teachers and above can create announcements', false)
  }

  // Fetch class names (for direct display in the response)
  let classNames: Array<{ id: number; name: string }> = []
  if (classIds.length) {
    const rows = await db
      .select({ id: schema.classes.id, name: schema.classes.name })
      .from(schema.classes)
      .where(inArray(schema.classes.id, classIds))
    classNames = rows
  }

  // Prepare insert values
  const insertValues = classIds.length
    ? classIds.map((cid) => ({
        courseId,
        name,
        content,
        classId: cid,
      }))
    : [{ courseId, name, content, classId: null }]

  const created = await db
    .insert(schema.announcements)
    .values(insertValues)
    .returning()

  return cResp({
    created: created.length,
    records: created,
    classNames,
    allClasses: classIds.length === 0,
  })
})
