import { db, schema } from '@nuxthub/db'
import { eq, and, isNull, lt } from 'drizzle-orm'
import { hashPassword } from '../../utils/auth'

/**
 * Forgot password - reset password
 * body: { token, newPassword }
 *
 * Flow:
 * 1. Validate token exists and starts with reset_
 * 2. Validate token not expired (within 30 minutes, judged by createdAt)
 * 3. Update user password
 * 4. Delete the token (one-time use)
 */
export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const { token, newPassword } = body || {}

  if (!token || !newPassword) {
    return cResp(null, 'Missing token or new password', false)
  }
  if (String(newPassword).length < 6) {
    return cResp(null, 'New password must be at least 6 characters', false)
  }
  if (!String(token).startsWith('reset_')) {
    return cResp(null, 'Invalid token', false)
  }

  // Find token
  const tokens = await db
    .select({
      id: schema.tokens.id,
      userId: schema.tokens.userId,
      createdAt: schema.tokens.createdAt,
    })
    .from(schema.tokens)
    .where(and(eq(schema.tokens.name, String(token)), isNull(schema.tokens.deletedAt)))
    .limit(1)

  if (!tokens[0]) {
    return cResp(null, 'Token invalid or already used', false)
  }

  // Validate expiration (30 minutes)
  const expiresAt = new Date(tokens[0].createdAt.getTime() + 30 * 60 * 1000)
  if (new Date() > expiresAt) {
    // Delete expired token
    await db.update(schema.tokens)
      .set({ deletedAt: new Date() })
      .where(eq(schema.tokens.id, tokens[0].id))
    return cResp(null, 'Token expired, please request again', false)
  }

  // Update password
  const hashedPwd = await hashPassword(String(newPassword))
  await db.update(schema.users)
    .set({ password: hashedPwd })
    .where(eq(schema.users.id, tokens[0].userId))

  // Delete token (one-time use)
  await db.update(schema.tokens)
    .set({ deletedAt: new Date() })
    .where(eq(schema.tokens.id, tokens[0].id))

  return cResp(null, 'Password reset successfully')
})
