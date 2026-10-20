import { db, schema } from '@nuxthub/db'
import { and, eq, isNull } from 'drizzle-orm'

/**
 * OAuth 用户信息端点
 *
 * GET /api/oauth/userinfo
 * Header: Authorization: Bearer <access_token>
 *
 * 返回 Hydro 侧 oauth provider 需要的字段：
 *   sub      —— 稳定主键（users.id，字符串），外部系统只能用这个做绑定键
 *   username —— 仅用于首次注册时挑 uname，不参与绑定
 *   email    —— Hydro 回调按 email 认领旧账号的唯一通道
 */
export default defineEventHandler(async (event) => {
  const token = getBearerToken(event)
  if (!token) return oauthUnauthorized(event)

  const [row] = await db
    .select({ userId: schema.tokens.userId })
    .from(schema.tokens)
    .where(and(eq(schema.tokens.name, token), isNull(schema.tokens.deletedAt)))
    .limit(1)

  if (!row) return oauthUnauthorized(event)

  const [user] = await db
    .select({
      id: schema.users.id,
      username: schema.users.username,
      name: schema.users.name,
      email: schema.users.email,
      avatarImg: schema.users.avatarImg,
    })
    .from(schema.users)
    .where(eq(schema.users.id, row.userId))
    .limit(1)

  if (!user) return oauthUnauthorized(event)

  return {
    sub: String(user.id),
    username: user.username,
    name: user.name,
    email: user.email || '',
    avatar: user.avatarImg || '',
  }
})
