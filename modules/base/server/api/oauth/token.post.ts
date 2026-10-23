import { db, schema } from '@nuxthub/db'
import { and, eq } from 'drizzle-orm'
import { generateToken, verifyPassword } from '../../utils/auth'

/**
 * OAuth / OIDC 换取 token 端点
 *
 * POST /api/oauth/token
 * body: { grant_type:'authorization_code', code, redirect_uri?, client_id?, client_secret? }
 * 或 Authorization: Basic base64(client_id:client_secret)
 *
 * access_token 直接复用 tokens 表（name = token），
 * 这样「改密后失效其它会话」的既有逻辑对 SSO 会话同样生效。
 *
 * id_token：Gitea 走的 openidConnect provider 强制要求 token 响应里有 id_token
 * （goth 的 FetchUser 少它就报 "cannot get user information without id_token"），
 * 并用它校验 iss/aud/exp。Hydro 的自研插件不读这个字段，多返回无害。
 * 不签发 refresh_token —— 外部系统拿到身份后自建 session，不需要长期凭证。
 */

/**
 * 读 token 请求体
 *
 * 必须自己解析：Hydro 的插件发 JSON，Gitea（Go x/oauth2）发
 * application/x-www-form-urlencoded，而 readBody 对不同 content-type 的
 * 处理在 h3 各版本间并不一致，显式解析两种格式最稳。
 */
async function readTokenBody(event: any): Promise<Record<string, any>> {
  const raw = (await readRawBody(event)) || ''
  if (!raw) return {}

  const contentType = String(getHeader(event, 'content-type') || '')
  if (contentType.includes('application/json') || raw.trimStart().startsWith('{')) {
    try {
      return JSON.parse(raw)
    } catch {
      return {}
    }
  }
  return Object.fromEntries(new URLSearchParams(raw))
}

export default defineEventHandler(async (event) => {
  // RFC 6749 §5.1：token 响应必须禁止缓存
  setHeader(event, 'cache-control', 'no-store')

  const body = await readTokenBody(event)
  const { grant_type, code, redirect_uri } = body
  const { clientId, clientSecret } = getClientCredentials(event, body)

  if (grant_type !== 'authorization_code') {
    return oauthError(event, 'unsupported_grant_type')
  }
  if (!code || !clientId || !clientSecret) {
    return oauthError(event, 'invalid_request')
  }

  // 1. 校验 client（secret 存的是 scrypt hash）
  const [client] = await db
    .select()
    .from(schema.oauthClients)
    .where(eq(schema.oauthClients.clientId, clientId))
    .limit(1)

  if (!client || !client.enabled) return oauthError(event, 'invalid_client')
  if (!(await verifyPassword(String(clientSecret), client.clientSecret))) {
    return oauthError(event, 'invalid_client')
  }

  // 2. 校验 code：必须属于该 client、未用过、未过期
  const [row] = await db
    .select()
    .from(schema.oauthCodes)
    .where(and(eq(schema.oauthCodes.code, code), eq(schema.oauthCodes.clientId, clientId)))
    .limit(1)

  if (!row || row.used || row.expiresAt.getTime() < Date.now()) {
    return oauthError(event, 'invalid_grant')
  }
  // 授权码与换 token 时的 redirect_uri 必须一致（RFC 6749 §4.1.3）
  if (redirect_uri && row.redirectUri !== redirect_uri) {
    return oauthError(event, 'invalid_grant')
  }

  // 3. 标记已用（条件更新，防并发重复兑换同一 code）
  const consumed = await db
    .update(schema.oauthCodes)
    .set({ used: true })
    .where(and(eq(schema.oauthCodes.code, code), eq(schema.oauthCodes.used, false)))
    .returning({ code: schema.oauthCodes.code })

  if (!consumed.length) return oauthError(event, 'invalid_grant')

  // 4. 发放 access_token（写入 tokens 表，与本站会话同构）
  const accessToken = generateToken()
  await db.insert(schema.tokens).values({ name: accessToken, userId: row.userId })

  // 5. 签发 id_token（OIDC 客户端按 iss/aud/exp 校验，claims 与 userinfo 保持一致）
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

  if (!user) return oauthError(event, 'invalid_grant')

  const now = Math.floor(Date.now() / 1000)
  const avatar = user.avatarImg || ''
  const idToken = signIdToken(
    {
      iss: oauthIssuer(event),
      sub: String(user.id),
      aud: client.clientId,
      iat: now,
      exp: now + 3600,
      name: user.name || user.username,
      nickname: user.username,
      preferred_username: user.username,
      email: user.email || '',
      email_verified: Boolean(user.email),
      picture: avatar.startsWith('http') ? avatar : '',
    },
    String(clientSecret),
  )

  return {
    access_token: accessToken,
    token_type: 'Bearer',
    expires_in: 3600,
    scope: 'openid profile email',
    id_token: idToken,
    sub: String(row.userId),
  }
})
