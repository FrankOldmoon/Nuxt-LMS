/**
 * 获取全部学生列表（仅管理员可用）
 * GET /api/lms/users/students
 *
 * 返回所有具有 student 角色的用户
 */
import { db, schema } from '@nuxthub/db'
import { eq, and, isNull } from 'drizzle-orm'

export default eventHandler(async (event) => {
  await requireAdmin(event)

  // 查询所有学生角色用户
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
