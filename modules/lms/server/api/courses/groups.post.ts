/**
 * Group management: update student groups
 * POST /api/courses/groups
 * body: { courseId, groups: { "group1": [{userId}, ...], ... } }
 *
 * Only the group leader (index 0) has the c_ prefix on the group field, used to mark leader identity
 */
import { db, schema } from '@nuxthub/db'
import { eq, and } from 'drizzle-orm'

export default eventHandler(async (event) => {
  const user = await requireAuth(event)
  const body = await readBody(event)
  const { courseId, groups } = body

  if (!courseId) return cResp(null, 'Missing courseId', false)
  if (!groups || typeof groups !== 'object') return cResp(null, 'Missing groups', false)

  // Only teachers or admins can modify groups
  const isTeacher = await isCourseTeacher(user.id, Number(courseId))
  if (!isTeacher && !user.roles.includes('admin')) {
    return cResp(null, 'No permission', false)
  }

  // 1. First clear the group of all students in this course (set to null)
  await db.update(schema.userCourses)
    .set({ group: null })
    .where(and(
      eq(schema.userCourses.courseId, Number(courseId)),
      eq(schema.userCourses.isTeacher, false),
    ))

  // 2. Batch upsert: automatically insert for user_courses records that don't exist
  for (const [groupName, members] of Object.entries(groups)) {
    const cleanName = groupName.startsWith('c_') ? groupName.slice(2) : groupName
    for (let i = 0; i < (members as any[]).length; i++) {
      const member = (members as any[])[i]
      // Group leader (first) gets c_ prefix; other members don't
      const groupValue = i === 0 ? `c_${cleanName}` : cleanName
      await db.insert(schema.userCourses)
        .values({
          userId: member.userId,
          courseId: Number(courseId),
          isTeacher: false,
          group: groupValue,
        })
        .onConflictDoUpdate({
          target: [schema.userCourses.userId, schema.userCourses.courseId],
          set: { group: groupValue },
        })
    }
  }

  return cResp(null, 'Groups updated successfully')
})
