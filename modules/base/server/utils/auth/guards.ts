import { db, schema } from '@nuxthub/db'
import { eq, and, isNull } from 'drizzle-orm'

export interface AuthUser {
  id: number
  username: string
  name: string
  roles: string[]
  permissions: string[]
}

/**
 * Parse current logged-in user from cookie (no throw, returns null if not logged in)
 * Suitable for "optional login" scenarios
 */
export async function getCurrentUser(event: any): Promise<AuthUser | null> {
  const tokenStr = getCookie(event, 'auth_token')
  if (!tokenStr) return null

  const tokens = await db
    .select()
    .from(schema.tokens)
    .where(and(eq(schema.tokens.name, tokenStr), isNull(schema.tokens.deletedAt)))
    .limit(1)

  if (!tokens[0]) return null

  const users = await db
    .select({ id: schema.users.id, username: schema.users.username, name: schema.users.name })
    .from(schema.users)
    .where(eq(schema.users.id, tokens[0].userId))
    .limit(1)

  if (!users[0]) return null

  const userId = users[0].id

  // Query roles
  const roleRows = await db
    .select({ code: schema.roles.code })
    .from(schema.userRoles)
    .innerJoin(schema.roles, eq(schema.userRoles.roleId, schema.roles.id))
    .where(eq(schema.userRoles.userId, userId))

  // Query permissions
  const permRows = await db
    .selectDistinct({ code: schema.permissions.code })
    .from(schema.userRoles)
    .innerJoin(schema.rolePermissions, eq(schema.userRoles.roleId, schema.rolePermissions.roleId))
    .innerJoin(schema.permissions, eq(schema.rolePermissions.permissionId, schema.permissions.id))
    .where(eq(schema.userRoles.userId, userId))

  return {
    id: users[0].id,
    username: users[0].username,
    name: users[0].name,
    roles: roleRows.map((r) => r.code),
    permissions: permRows.map((p) => p.code),
  }
}

/** Require login, throw 401 if not logged in */
export async function requireAuth(event: any): Promise<AuthUser> {
  const user = await getCurrentUser(event)
  if (!user) {
    throw createError({ statusCode: 401, message: 'Please log in first' })
  }
  return user
}

/** Require user to have one of the specified roles, throw 403 otherwise */
export async function requireRole(event: any, roleCodes: string[]): Promise<AuthUser> {
  const user = await requireAuth(event)
  const hasRole = roleCodes.some((code) => user.roles.includes(code))
  if (!hasRole) {
    throw createError({ statusCode: 403, message: 'No permission to perform this operation' })
  }
  return user
}

/** Require user to have one of the specified permissions, throw 403 otherwise */
export async function requirePermission(event: any, permCodes: string[]): Promise<AuthUser> {
  const user = await requireAuth(event)
  const hasPerm = permCodes.some((code) => user.permissions.includes(code))
  if (!hasPerm) {
    throw createError({ statusCode: 403, message: 'No permission to perform this operation' })
  }
  return user
}

/** Require admin role, throw 403 otherwise */
export async function requireAdmin(event: any): Promise<AuthUser> {
  return requireRole(event, ['admin'])
}
