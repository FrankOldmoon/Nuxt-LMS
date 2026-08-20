/**
 * 恢复原始身份（模拟登录后刷新页面时自动调用）
 * POST /api/auth/restore
 *
 * 检查 original_token cookie，如果存在则恢复原始身份
 */
import { db, schema } from '@nuxthub/db'
import { eq, and, isNull } from 'drizzle-orm'

export default defineEventHandler(async (event) => {
  const originalToken = getCookie(event, 'original_token')
  const currentToken = getCookie(event, 'auth_token')

  if (!originalToken || !currentToken) {
    return cResp({ restored: false }, '无需恢复')
  }

  // 校验当前会话有效（正处于模拟登录状态）
  const curRow = await db
    .select({ userId: schema.tokens.userId })
    .from(schema.tokens)
    .where(and(eq(schema.tokens.name, currentToken), isNull(schema.tokens.deletedAt)))
    .limit(1)
  if (!curRow[0]) {
    return cResp({ restored: false }, '当前会话无效，无法恢复')
  }

  // 安全：original_token 必须是有效 token 且属于教师/管理员（模拟身份的原拥有者），
  // 防止伪造 original_token cookie 恢复到任意身份
  const origRow = await db
    .select({ userId: schema.tokens.userId })
    .from(schema.tokens)
    .where(and(eq(schema.tokens.name, originalToken), isNull(schema.tokens.deletedAt)))
    .limit(1)
  if (!origRow[0]) {
    return cResp({ restored: false }, '原始身份无效，无法恢复')
  }
  const roleRows = await db
    .select({ code: schema.roles.code })
    .from(schema.userRoles)
    .innerJoin(schema.roles, eq(schema.userRoles.roleId, schema.roles.id))
    .where(eq(schema.userRoles.userId, origRow[0].userId))
  if (!roleRows.some(r => r.code === 'teacher' || r.code === 'admin')) {
    return cResp({ restored: false }, '原始身份无权，无法恢复')
  }

  // 恢复原始 token
  setCookie(event, 'auth_token', originalToken, {
    httpOnly: true,
    secure: getRequestProtocol(event) === 'https',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 7, // 7 天
    path: '/',
  })

  // 清除 original_token
  deleteCookie(event, 'original_token', { path: '/' })

  return cResp({ restored: true }, '已恢复原始身份')
})
