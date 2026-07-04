import { db, schema } from '@nuxthub/db'
import { eq, and, isNull, lt } from 'drizzle-orm'
import { hashPassword } from '../../utils/auth'

/**
 * 忘记密码 - 重置密码
 * body: { token, newPassword }
 *
 * 流程：
 * 1. 校验 token 存在且以 reset_ 开头
 * 2. 校验 token 未过期（30 分钟内，按 createdAt 判断）
 * 3. 更新用户密码
 * 4. 删除该 token（一次性）
 */
export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const { token, newPassword } = body || {}

  if (!token || !newPassword) {
    return cResp(null, '缺少 token 或新密码', false)
  }
  if (String(newPassword).length < 6) {
    return cResp(null, '新密码长度至少6位', false)
  }
  if (!String(token).startsWith('reset_')) {
    return cResp(null, '无效的 token', false)
  }

  // 查找 token
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
    return cResp(null, 'token 无效或已使用', false)
  }

  // 校验是否过期（30 分钟）
  const expiresAt = new Date(tokens[0].createdAt.getTime() + 30 * 60 * 1000)
  if (new Date() > expiresAt) {
    // 删除过期 token
    await db.update(schema.tokens)
      .set({ deletedAt: new Date() })
      .where(eq(schema.tokens.id, tokens[0].id))
    return cResp(null, 'token 已过期，请重新申请', false)
  }

  // 更新密码
  const hashedPwd = await hashPassword(String(newPassword))
  await db.update(schema.users)
    .set({ password: hashedPwd })
    .where(eq(schema.users.id, tokens[0].userId))

  // 删除 token（一次性）
  await db.update(schema.tokens)
    .set({ deletedAt: new Date() })
    .where(eq(schema.tokens.id, tokens[0].id))

  return cResp(null, '密码重置成功')
})
