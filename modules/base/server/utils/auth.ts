import { randomBytes, scrypt } from 'node:crypto'
import { db, schema } from '@nuxthub/db'
import { eq, and, isNull } from 'drizzle-orm'

const SALT_LENGTH = 16
const KEY_LENGTH = 64

// ====================== 密码 / Token 工具 ======================

/** 密码哈希（与 seed.ts 保持一致：salt:derivedKey 格式） */
export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(SALT_LENGTH).toString('hex')
  const derivedKey = await new Promise<Buffer>((resolve, reject) => {
    scrypt(password, salt, KEY_LENGTH, (err, key) => {
      if (err) reject(err)
      else resolve(key)
    })
  })
  return `${salt}:${derivedKey.toString('hex')}`
}

/** 验证密码 */
export async function verifyPassword(password: string, hashed: string): Promise<boolean> {
  const [salt, key] = hashed.split(':')
  if (!salt || !key) return false
  const derivedKey = await new Promise<Buffer>((resolve, reject) => {
    scrypt(password, salt, KEY_LENGTH, (err, key) => {
      if (err) reject(err)
      else resolve(key)
    })
  })
  return key === derivedKey.toString('hex')
}

/** 生成随机 token */
export function generateToken(): string {
  return randomBytes(32).toString('hex')
}

// ====================== 鉴权守卫（在 API handler 中调用） ======================

export interface AuthUser {
  id: number
  username: string
  name: string
  roles: string[]
  permissions: string[]
}

/**
 * 从 cookie 中解析当前登录用户（不抛错，未登录返回 null）
 * 适合需要"可选登录"的场景
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

  // 查角色
  const roleRows = await db
    .select({ code: schema.roles.code })
    .from(schema.userRoles)
    .innerJoin(schema.roles, eq(schema.userRoles.roleId, schema.roles.id))
    .where(eq(schema.userRoles.userId, userId))

  // 查权限
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

/**
 * 要求登录，未登录抛 401
 */
export async function requireAuth(event: any): Promise<AuthUser> {
  const user = await getCurrentUser(event)
  if (!user) {
    throw createError({ statusCode: 401, statusMessage: '请先登录' })
  }
  return user
}

/**
 * 要求用户拥有指定角色之一，否则抛 403
 */
export async function requireRole(event: any, roleCodes: string[]): Promise<AuthUser> {
  const user = await requireAuth(event)
  const hasRole = roleCodes.some((code) => user.roles.includes(code))
  if (!hasRole) {
    throw createError({ statusCode: 403, statusMessage: '无权限执行此操作' })
  }
  return user
}

/**
 * 要求用户拥有指定权限之一，否则抛 403
 */
export async function requirePermission(event: any, permCodes: string[]): Promise<AuthUser> {
  const user = await requireAuth(event)
  const hasPerm = permCodes.some((code) => user.permissions.includes(code))
  if (!hasPerm) {
    throw createError({ statusCode: 403, statusMessage: '无权限执行此操作' })
  }
  return user
}

/**
 * 要求管理员角色，否则抛 403
 */
export async function requireAdmin(event: any): Promise<AuthUser> {
  return requireRole(event, ['admin'])
}

/**
 * 检查当前用户是否是某课程的教师/编辑者（教师或编辑者均可）
 */
export async function isCourseTeacher(userId: number, courseId: number): Promise<boolean> {
  if (!(schema as any).userCourses) return false
  const rows = await db
    .select({ isTeacher: (schema as any).userCourses.isTeacher, isEditor: (schema as any).userCourses.isEditor })
    .from((schema as any).userCourses)
    .where(
      and(
        eq((schema as any).userCourses.userId, userId),
        eq((schema as any).userCourses.courseId, courseId),
      ),
    )
    .limit(1)
  return rows.length > 0 && !!(rows[0].isTeacher || rows[0].isEditor)
}

/**
 * 检查当前用户是否是某课程的编辑者（仅编辑者，不含教师）
 */
export async function isCourseEditor(userId: number, courseId: number): Promise<boolean> {
  if (!(schema as any).userCourses) return false
  const rows = await db
    .select({ isEditor: (schema as any).userCourses.isEditor })
    .from((schema as any).userCourses)
    .where(
      and(
        eq((schema as any).userCourses.userId, userId),
        eq((schema as any).userCourses.courseId, courseId),
      ),
    )
    .limit(1)
  return rows.length > 0 && !!rows[0].isEditor
}

/**
 * 要求是管理员或是目标课程的编辑者，否则抛 403
 * @param courseId - 课程 ID
 */
export async function requireCourseTeacher(event: any, courseId: number): Promise<AuthUser> {
  const user = await requireAuth(event)
  if (user.roles.includes('admin')) return user

  if (await isCourseEditor(user.id, courseId)) return user

  throw createError({ statusCode: 403, statusMessage: '无权限：仅管理员或课程编辑者可操作' })
}

/**
 * 要求是管理员或是目标章节所属课程的编辑者
 * 自动查询章节的 courseId 再做判断
 * @param chapterId - 章节 ID
 */
export async function requireChapterTeacher(event: any, chapterId: number): Promise<AuthUser> {
  const user = await requireAuth(event)
  if (user.roles.includes('admin')) return user

  if (!(schema as any).chapters) {
    throw createError({ statusCode: 403, statusMessage: '无权限' })
  }

  // 查询章节所属课程
  const rows = await db
    .select({ courseId: (schema as any).chapters.courseId })
    .from((schema as any).chapters)
    .where(eq((schema as any).chapters.id, chapterId))
    .limit(1)

  if (!rows[0]) {
    throw createError({ statusCode: 404, statusMessage: '章节不存在' })
  }

  if (await isCourseEditor(user.id, rows[0].courseId)) return user

  throw createError({ statusCode: 403, statusMessage: '无权限：仅管理员或该课程的编辑者可操作' })
}
