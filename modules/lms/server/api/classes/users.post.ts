import { db, schema } from '@nuxthub/db'

/**
 * Batch add users to a class
 * body: { classId: number, userIds: number[], isTeacher?: boolean }
 *
 * Side effects:
 * - When isTeacher=true, automatically assign the 'teacher' role to all added users
 *   (the class isTeacher flag and the system-level teacher role work together; see useAuth.isCourseTeacher)
 */
export default eventHandler(async (event) => {
  const body = await readBody(event)
  const { classId, userIds, isTeacher } = body

  if (!classId || !Array.isArray(userIds) || !userIds.length) {
    return cResp(null, 'Missing parameters', false)
  }

  await requireAdmin(event)

  try {
    const rows = userIds.map((userId: number) => ({
      userId,
      classId: Number(classId),
      ...(isTeacher !== undefined ? { isTeacher } : {}),
    }))

    await db
      .insert(schema.userClasses)
      .values(rows)
      .onConflictDoNothing()

    // When set as teacher in the class, also add the teacher role to each user (idempotent; failures only warn)
    if (isTeacher === true) {
      await Promise.all(
        userIds.map((userId: number) => assignRoleToUser(Number(userId), 'teacher')),
      )
    }

    return cResp({ success: true, added: userIds.length })
  } catch (error: any) {
    console.error('Failed to add class users:', error)
    return cResp(null, error.message || 'Add failed', false)
  }
})
