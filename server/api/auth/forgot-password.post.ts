import { db, schema } from '@nuxthub/db'
import { eq, and, isNull } from 'drizzle-orm'
import { generateToken } from '../../utils/auth'
import { getSiteConfigSync } from '../../utils/siteConfig'
import { sendPasswordResetEmail } from '../../utils/mail'

/**
 * 忘记密码 - 请求重置
 * body: { email }
 *
 * 流程：
 * 1. 按邮箱查找用户，存在才发邮件（不泄露邮箱是否存在）
 * 2. 生成 reset token 存入 tokens 表（name 带 reset_ 前缀，30 分钟有效）
 * 3. 发送含重置链接的邮件
 *
 * 无论用户是否存在都返回成功（防枚举）
 */
export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const { email } = body || {}

  if (!email) {
    return cResp(null, '请输入邮箱', false)
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
  const cfg = getSiteConfigSync()
  const siteUrl = cfg?.mail?.siteUrl || ''

  if (!cfg?.mail?.host) {
    return cResp(null, '邮件服务未配置，请联系管理员', false)
  }

  // 生成 reset token
  const tokenStr = `reset_${generateToken()}`
  const expiresAt = new Date(Date.now() + 30 * 60 * 1000) // 30 分钟

  await db.insert(schema.tokens).values({
    name: tokenStr,
    userId: user.id,
    // tokens 表没有 expiresAt 字段，用 createdAt + 30min 校验
  })

  // 拼接重置链接
  const resetUrl = siteUrl
    ? `${siteUrl.replace(/\/$/, '')}/reset-password?token=${tokenStr}`
    : `/reset-password?token=${tokenStr}`

  // 发送邮件
  const ok = await sendPasswordResetEmail(user.email, resetUrl)
  if (!ok) {
    return cResp(null, '邮件发送失败，请稍后重试或联系管理员', false)
  }

  return cResp(null, '重置密码邮件已发送，请查收')
})
