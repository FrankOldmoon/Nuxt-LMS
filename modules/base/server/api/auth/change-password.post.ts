import { db, schema } from '@nuxthub/db'
import { eq } from 'drizzle-orm'
import { hashPassword, verifyPassword } from '../../utils/auth'

/**
 * Change own password
 * body: { oldPassword, newPassword }
 * - Verify old password is correct
 * - New password length >= 6
 * - Update to new password
 */
export default defineEventHandler(async (event) => {
  const authUser = await requireAuth(event)
  const body = await readBody(event)
  const { oldPassword, newPassword } = body || {}

  if (!oldPassword || !newPassword) {
    return cResp(null, 'Missing old password or new password', false)
  }
  if (String(newPassword).length < 6) {
    return cResp(null, 'New password must be at least 6 characters', false)
  }

  // Query current user password
  const users = await db
    .select({ id: schema.users.id, password: schema.users.password })
    .from(schema.users)
    .where(eq(schema.users.id, authUser.id))
    .limit(1)

  if (!users[0]) {
    return cResp(null, 'User does not exist', false)
  }

  // Verify old password
  const valid = await verifyPassword(String(oldPassword), users[0].password)
  if (!valid) {
    return cResp(null, 'Old password is incorrect', false)
  }

  // Update password
  const hashedPwd = await hashPassword(String(newPassword))
  await db.update(schema.users)
    .set({ password: hashedPwd })
    .where(eq(schema.users.id, authUser.id))

  return cResp(null, 'Password changed successfully')
})
