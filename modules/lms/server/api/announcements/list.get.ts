/**
 * Announcement list
 * GET /api/announcements/list?courseId=X
 *
 * Permissions:
 * - Course teacher / admin: returns all announcements for the course
 * - Student: returns only announcements with classId = the student's class
 *   OR classId IS NULL (for everyone)
 *
 * Sorted by time in descending order
 */
import { db, schema } from '@nuxthub/db'
import { eq, and, or, isNull, desc } from 'drizzle-orm'

export default eventHandler(async (event) => {
  const user = await requireAuth(event)
  const courseId = Number(getQuery(event).courseId)
  if (!courseId) return cResp([], 'Missing courseId', false)

  const isStaff = user.roles.includes('admin')
    || user.roles.includes('teacher')
    || (await isCourseTeacher(user.id, courseId))

  if (isStaff) {
    // Teacher/admin: return all
    const rows = await db
      .select()
      .from(schema.announcements)
      .where(eq(schema.announcements.courseId, courseId))
      .orderBy(desc(schema.announcements.createdAt))
    return cResp(rows)
  }

  // Student: first look up the student's class (classId)
  const userRows = await db
    .select({ classId: schema.users.classId })
    .from(schema.users)
    .where(eq(schema.users.id, user.id))
    .limit(1)
  const userClassId = userRows[0]?.classId || null

  // Only matching classId or unspecified (for everyone)
  const where = userClassId
    ? and(
        eq(schema.announcements.courseId, courseId),
        or(isNull(schema.announcements.classId), eq(schema.announcements.classId, userClassId)),
      )
    : and(
        eq(schema.announcements.courseId, courseId),
        isNull(schema.announcements.classId),
      )

  const rows = await db
    .select()
    .from(schema.announcements)
    .where(where)
    .orderBy(desc(schema.announcements.createdAt))
  return cResp(rows)
})
