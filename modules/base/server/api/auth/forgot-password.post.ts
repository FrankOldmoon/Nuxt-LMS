import { db, schema } from '@nuxthub/db'
import { eq, and, isNull } from 'drizzle-orm'

/**
 * 忘记密码 - 请求重置
 * body: { email }
 *
 * 流程：
 * 1. 检查 site:allowForgotPassword 开关
 * 2. 按邮箱查找用户，存在才发邮件（不泄露邮箱是否存在）
 * 3. 生成 reset token 存入 tokens 表（name 带 reset_ 前缀，30 分钟有效）
 * 4. 发送含重置链接的邮件
 *
 * 无论用户是否存在都返回成功（防枚举）
 */
export default defineEventHandler(async (event) => {
  // 检查是否启用忘记密码功能
  if (!(await getConfig('site:allowForgotPassword'))) {
    return cResp(null, 'Password reset is disabled', false)
  }

  const body = await readBody(event)
  const { email } = body || {}

  if (!email) {
    return cResp(null, '请输入邮箱', false)
  }

  // 邮件服务未配置时也返回同一提示（M2 防枚举：不区分邮箱是否存在）
  const mail = await getConfigByPrefix('site:mail')
  if (!mail.host) {
    return cResp(null, '如果该邮箱已注册，你将收到重置密码邮件')
  }

  // 查找用户
  const users = await db
    .select({ id: schema.users.id, name: schema.users.name, email: schema.users.email })
    .from(schema.users)
    .where(and(eq(schema.users.email, String(email)), isNull(schema.users.deletedAt)))
    .limit(1)

  // 无论是否存在都返回成功（防枚举攻击）
  if (!users[0]) {
    return cResp(null, '如果该邮箱已注册，你将收到重置密码邮件')
  }

  const user = users[0]

  // 生成 reset token
  const tokenStr = `reset_${generateToken()}`
  const expiresAt = new Date(Date.now() + 30 * 60 * 1000) // 30 分钟

  await db.insert(schema.tokens).values({
    name: tokenStr,
    userId: user.id,
    // tokens 表没有 expiresAt 字段，用 createdAt + 30min 校验
  })

  // 拼接重置链接
  const siteUrl = mail.siteUrl || ''
  const resetUrl = siteUrl
    ? `${siteUrl.replace(/\/$/, '')}/reset-password?token=${tokenStr}`
    : `/reset-password?token=${tokenStr}`

  // 发送邮件（失败也返回同一提示，避免通过响应差异枚举邮箱）
  await sendPasswordResetEmail(user.email, resetUrl)

  return cResp(null, '如果该邮箱已注册，你将收到重置密码邮件')
})
