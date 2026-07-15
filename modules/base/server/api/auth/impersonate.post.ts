/**
 * Impersonate login (teacher/admin switches to student view)
 * POST /api/auth/impersonate
 * body: { userId }
 *
 * Generate target user's token and set to cookie, original token saved to cookie for restoration
 * Supports continuous switching: does not overwrite if original_token already exists
 * Verifies via original_token whether the caller is teacher/admin
 */
import { db, schema } from '@nuxthub/db'
import { eq, and, isNull } from 'drizzle-orm'

export default defineEventHandler(async (event) => {
  // Permission check: prefer original_token (continuous switching scenario), otherwise check current auth_token
  const originalToken = getCookie(event, 'original_token')
  const currentToken = getCookie(event, 'auth_token')

  let authUserId: number

  if (originalToken) {
    // Already in impersonation mode, verify original identity with original_token
    const tokenRow = await db
      .select({ userId: schema.tokens.userId })
      .from(schema.tokens)
      .where(and(eq(schema.tokens.name, originalToken), isNull(schema.tokens.deletedAt)))
      .limit(1)
    if (!tokenRow[0]) {
      throw createError({ statusCode: 401, message: 'Invalid original token' })
    }
    authUserId = tokenRow[0].userId
  } else if (currentToken) {
    // First impersonation, verify identity with current token
    const tokenRow = await db
      .select({ userId: schema.tokens.userId })
      .from(schema.tokens)
      .where(and(eq(schema.tokens.name, currentToken), isNull(schema.tokens.deletedAt)))
      .limit(1)
    if (!tokenRow[0]) {
      throw createError({ statusCode: 401, message: 'Not authenticated' })
    }
    authUserId = tokenRow[0].userId
  } else {
    throw createError({ statusCode: 401, message: 'Not authenticated' })
  }

  // Verify original user is teacher or admin
  const roleRows = await db
    .select({ code: schema.roles.code })
    .from(schema.userRoles)
    .innerJoin(schema.roles, eq(schema.userRoles.roleId, schema.roles.id))
    .where(eq(schema.userRoles.userId, authUserId))
  const isPrivileged = roleRows.some(r => r.code === 'teacher' || r.code === 'admin')
  if (!isPrivileged) {
    throw createError({ statusCode: 403, message: 'No permission: only teacher/admin can switch identity' })
  }

  const body = await readBody(event)
  const { userId } = body
  if (!userId) {
    return cResp(null, 'Missing userId', false)
  }

  // Verify target user exists
  const targetUser = await db
    .select({ id: schema.users.id, name: schema.users.name })
    .from(schema.users)
    .where(eq(schema.users.id, Number(userId)))
    .limit(1)

  if (!targetUser[0]) {
    return cResp(null, 'Target user does not exist', false)
  }

  // Only save original token on first impersonation (do not overwrite if original_token exists)
  if (!originalToken && currentToken) {
    setCookie(event, 'original_token', currentToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60,
      path: '/',
    })
  }

  // Generate new token for target user
  const tokenStr = generateToken()
  await db.insert(schema.tokens).values({
    name: tokenStr,
    userId: Number(userId),
  })

  // Set new token to cookie
  setCookie(event, 'auth_token', tokenStr, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60,
    path: '/',
  })

  return cResp({
    userId: Number(userId),
    name: targetUser[0].name,
    impersonatedBy: authUserId,
  }, 'Switched to student view')
})
