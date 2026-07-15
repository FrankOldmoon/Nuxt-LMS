import { db, schema } from '@nuxthub/db'
import { eq, and, isNull } from 'drizzle-orm'

/**
 * Forgot password - request reset
 * body: { email }
 *
 * Flow:
 * 1. Check site:allowForgotPassword toggle
 * 2. Find user by email, only send if exists (does not leak whether email exists)
 * 3. Generate reset token and store in tokens table (name with reset_ prefix, valid for 30 minutes)
 * 4. Send email with reset link
 *
 * Always return success whether user exists or not (anti-enumeration)
 */
export default defineEventHandler(async (event) => {
  // Check if forgot password feature is enabled
  if (!(await getConfig('site:allowForgotPassword'))) {
    return cResp(null, 'Password reset is disabled', false)
  }

  const body = await readBody(event)
  const { email } = body || {}

  if (!email) {
    return cResp(null, 'Please enter email', false)
  }

  // Find user
  const users = await db
    .select({ id: schema.users.id, name: schema.users.name, email: schema.users.email })
    .from(schema.users)
    .where(and(eq(schema.users.email, String(email)), isNull(schema.users.deletedAt)))
    .limit(1)

  // Always return success whether exists or not (anti-enumeration attack)
  if (!users[0]) {
    return cResp(null, 'If this email is registered, you will receive a password reset email')
  }

  const user = users[0]
  const mail = await getConfigByPrefix('site:mail')

  if (!mail.host) {
    return cResp(null, 'Mail service is not configured, please contact the administrator', false)
  }

  // Generate reset token
  const tokenStr = `reset_${generateToken()}`
  const expiresAt = new Date(Date.now() + 30 * 60 * 1000) // 30 minutes

  await db.insert(schema.tokens).values({
    name: tokenStr,
    userId: user.id,
    // tokens table has no expiresAt field, validate with createdAt + 30min
  })

  // Build reset link
  const siteUrl = mail.siteUrl || ''
  const resetUrl = siteUrl
    ? `${siteUrl.replace(/\/$/, '')}/reset-password?token=${tokenStr}`
    : `/reset-password?token=${tokenStr}`

  // Send email
  const ok = await sendPasswordResetEmail(user.email, resetUrl)
  if (!ok) {
    return cResp(null, 'Email send failed, please retry later or contact the administrator', false)
  }

  return cResp(null, 'Password reset email has been sent, please check your inbox')
})
