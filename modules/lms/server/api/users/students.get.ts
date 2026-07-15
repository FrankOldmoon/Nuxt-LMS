/**
 * Get the full list of students (admin only)
 * GET /api/users/students
 *
 * Returns all users with the student role
 */
import { db, schema } from '@nuxthub/db'
import { eq, and, isNull } from 'drizzle-orm'

export default eventHandler(async (event) => {
  await requireAdmin(event)

  // Query all users with the student role
  const students = await db
    .select({
      id: schema.users.id,
      username: schema.users.username,
      name: schema.users.name,
      preferName: schema.users.preferName,
      avatarImg: schema.users.avatarImg,
      rollNumber: schema.users.rollNumber,
    })
    .from(schema.userRoles)
    .innerJoin(schema.users, eq(schema.userRoles.userId, schema.users.id))
    .innerJoin(schema.roles, eq(schema.userRoles.roleId, schema.roles.id))
    .where(
      and(
        eq(schema.roles.code, 'student'),
        isNull(schema.users.deletedAt),
      ),
    )
    .orderBy(schema.users.name)

  return cResp(students)
})
