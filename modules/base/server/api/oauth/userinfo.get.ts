import { db, schema } from '@nuxthub/db'
import { and, eq, isNull } from 'drizzle-orm'

/**
 * OAuth / OIDC 用户信息端点
 *
 * GET /api/oauth/userinfo
 * Header: Authorization: Bearer <access_token>
 *
 * 返回各接入方需要的字段：
 *   sub      —— 稳定主键（users.id，字符串），外部系统只能用这个做绑定键
 *   username —— 仅用于首次注册时挑用户名，不参与绑定
 *   email    —— 旧账号认领通道（Hydro 回调按 email 匹配，Gitea 不按 email 匹配）
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

  const avatar = user.avatarImg || ''

  return {
    // 稳定主键：外部系统只能用 sub 做绑定键
    sub: String(user.id),
    // 以下四组是各客户端认可的「用户名 / 昵称 / 头像」claim 名：
    //   Gitea(goth OIDC) 读 nickname → preferred_username，picture 当头像
    //   Hydro(lms-oauth 插件) 读 username / name / email / avatar
    username: user.username,
    preferred_username: user.username,
    nickname: user.username,
    name: user.name || user.username,
    email: user.email || '',
    email_verified: Boolean(user.email),
    avatar,
    picture: avatar.startsWith('http') ? avatar : '',
  }
})
