/**
 * 模拟登录（教师/管理员切换为学生视角）
 * POST /api/auth/impersonate
 * body: { userId }
 *
 * 生成目标用户的 token 并设置到 cookie，原始 token 保存到 cookie 供恢复
 * 支持连续切换：已有 original_token 时不覆盖
 * 通过 original_token 验证调用者是否为教师/管理员
 */
import { db, schema } from '@nuxthub/db'
import { eq, and, isNull } from 'drizzle-orm'

export default defineEventHandler(async (event) => {
  // 权限校验：优先检查 original_token（连续切换场景），否则检查当前 auth_token
  const originalToken = getCookie(event, 'original_token')
  const currentToken = getCookie(event, 'auth_token')

  let authUserId: number

  if (originalToken) {
    // 已在模拟模式，用 original_token 验证原始身份
    const tokenRow = await db
      .select({ userId: schema.tokens.userId })
      .from(schema.tokens)
      .where(and(eq(schema.tokens.name, originalToken), isNull(schema.tokens.deletedAt)))
      .limit(1)
    if (!tokenRow[0]) {
      throw createError({ statusCode: 401, message: '原始 token 无效' })
    }
    authUserId = tokenRow[0].userId
  } else if (currentToken) {
    // 首次模拟，用当前 token 验证身份
    const tokenRow = await db
      .select({ userId: schema.tokens.userId })
      .from(schema.tokens)
      .where(and(eq(schema.tokens.name, currentToken), isNull(schema.tokens.deletedAt)))
      .limit(1)
    if (!tokenRow[0]) {
      throw createError({ statusCode: 401, message: '未认证' })
    }
    authUserId = tokenRow[0].userId
  } else {
    throw createError({ statusCode: 401, message: '未认证' })
  }

  // 验证原始用户是教师或管理员
  const roleRows = await db
    .select({ code: schema.roles.code })
    .from(schema.userRoles)
    .innerJoin(schema.roles, eq(schema.userRoles.roleId, schema.roles.id))
    .where(eq(schema.userRoles.userId, authUserId))
  const isPrivileged = roleRows.some(r => r.code === 'teacher' || r.code === 'admin')
  if (!isPrivileged) {
    throw createError({ statusCode: 403, message: '无权限：仅教师/管理员可切换身份' })
  }
  const callerIsAdmin = roleRows.some(r => r.code === 'admin')

  const body = await readBody(event)
  const { userId } = body
  if (!userId) {
    return cResp(null, '缺少 userId', false)
  }

  // 验证目标用户存在
  const targetUser = await db
    .select({ id: schema.users.id, name: schema.users.name })
    .from(schema.users)
    .where(eq(schema.users.id, Number(userId)))
    .limit(1)

  if (!targetUser[0]) {
    return cResp(null, '目标用户不存在', false)
  }

  // 防提权：非 admin 调用者（teacher）不能模拟教师/管理员账号
  if (!callerIsAdmin) {
    const targetRoles = await db
      .select({ code: schema.roles.code })
      .from(schema.userRoles)
      .innerJoin(schema.roles, eq(schema.userRoles.roleId, schema.roles.id))
      .where(eq(schema.userRoles.userId, Number(userId)))
    if (targetRoles.some(r => r.code === 'teacher' || r.code === 'admin')) {
      throw createError({ statusCode: 403, message: '无权限：不能切换到教师/管理员账号' })
    }
  }

  // 仅在首次模拟时保存原始 token（已有 original_token 时不覆盖）
  if (!originalToken && currentToken) {
    setCookie(event, 'original_token', currentToken, {
      httpOnly: true,
      secure: getRequestProtocol(event) === 'https',
      sameSite: 'lax',
      maxAge: 60 * 60,
      path: '/',
    })
  }

  // 为目标用户生成新 token
  const tokenStr = generateToken()
  await db.insert(schema.tokens).values({
    name: tokenStr,
    userId: Number(userId),
  })

  // 设置新 token 到 cookie
  setCookie(event, 'auth_token', tokenStr, {
    httpOnly: true,
    secure: getRequestProtocol(event) === 'https',
    sameSite: 'lax',
    maxAge: 60 * 60,
    path: '/',
  })

  return cResp({
    userId: Number(userId),
    name: targetUser[0].name,
    impersonatedBy: authUserId,
  }, '已切换为学生视角')
})
