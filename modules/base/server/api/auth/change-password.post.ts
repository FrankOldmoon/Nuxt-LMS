import { db, schema } from '@nuxthub/db'
import { eq } from 'drizzle-orm'
import { hashPassword, verifyPassword } from '../../utils/auth'

/**
 * 修改自己的密码
 * body: { oldPassword, newPassword }
 * - 验证旧密码正确
 * - 新密码长度 >= 6
 * - 更新为新密码
 */
export default defineEventHandler(async (event) => {
  const authUser = await requireAuth(event)
  const body = await readBody(event)
  const { oldPassword, newPassword } = body || {}

  if (!oldPassword || !newPassword) {
    return cResp(null, '缺少旧密码或新密码', false)
  }
  if (String(newPassword).length < 6) {
    return cResp(null, '新密码长度至少6位', false)
  }

  // 查询当前用户密码
  const users = await db
    .select({ id: schema.users.id, password: schema.users.password })
    .from(schema.users)
    .where(eq(schema.users.id, authUser.id))
    .limit(1)

  if (!users[0]) {
    return cResp(null, '用户不存在', false)
  }

  // 验证旧密码
  const valid = await verifyPassword(String(oldPassword), users[0].password)
  if (!valid) {
    return cResp(null, '旧密码不正确', false)
  }

  // 更新密码
  const hashedPwd = await hashPassword(String(newPassword))
  await db.update(schema.users)
    .set({ password: hashedPwd })
    .where(eq(schema.users.id, authUser.id))

  return cResp(null, '密码修改成功')
})
