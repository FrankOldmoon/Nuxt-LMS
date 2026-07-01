import { db, schema } from '@nuxthub/db'
import { eq, and, isNull } from 'drizzle-orm'
import { cResp } from '../../utils/index'

export default defineEventHandler(async (event) => {
  const tokenStr = getCookie(event, 'auth_token')
  if (!tokenStr) {
    return cResp(null, 'Not authenticated', false)
  }

  // 查找有效的 token
  const tokens = await db
    .select()
    .from(schema.tokens)
    .where(
      and(
        eq(schema.tokens.name, tokenStr),
        isNull(schema.tokens.deletedAt),
      ),
    )
    .limit(1)

  const token = tokens[0]
  if (!token) {
    return cResp(null, 'Invalid token', false)
  }

  // 查找用户
  const users = await db
    .select({
      id: schema.users.id,
      username: schema.users.username,
      name: schema.users.name,
      email: schema.users.email,
      avatarImg: schema.users.avatarImg,
      preferName: schema.users.preferName,
      englishName: schema.users.englishName,
      defaultLocale: schema.users.defaultLocale,
    })
    .from(schema.users)
    .where(eq(schema.users.id, token.userId))
    .limit(1)

  const userRecord = users[0]
  if (!userRecord) {
    return cResp(null, 'User not found', false)
  }

  const userId = userRecord.id

  // 查询用户角色
  const roleRows = await db
    .select({
      code: schema.roles.code,
      name: schema.roles.name,
    })
    .from(schema.userRoles)
    .innerJoin(schema.roles, eq(schema.userRoles.roleId, schema.roles.id))
    .where(eq(schema.userRoles.userId, userId))

  // 查询用户权限（通过角色关联）
  const permRows = await db
    .selectDistinct({
      code: schema.permissions.code,
      name: schema.permissions.name,
    })
    .from(schema.userRoles)
    .innerJoin(schema.rolePermissions, eq(schema.userRoles.roleId, schema.rolePermissions.roleId))
    .innerJoin(schema.permissions, eq(schema.rolePermissions.permissionId, schema.permissions.id))
    .where(eq(schema.userRoles.userId, userId))

  return cResp({
    user: userRecord,
    roles: roleRows,
    permissions: permRows,
  })
})
