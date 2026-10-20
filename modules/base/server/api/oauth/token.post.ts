import { db, schema } from '@nuxthub/db'
import { and, eq } from 'drizzle-orm'
import { generateToken, verifyPassword } from '../../utils/auth'

/**
 * OAuth 换取 token 端点
 *
 * POST /api/oauth/token
 * body: { grant_type:'authorization_code', code, client_id, client_secret, redirect_uri? }
 *
 * access_token 直接复用 tokens 表（name = token），
 * 这样「改密后失效其它会话」的既有逻辑对 SSO 会话同样生效。
 * 不签发 refresh_token / id_token —— 外部系统拿到身份后自建 session，不需要长期凭证。
 */
export default defineEventHandler(async (event) => {
  const body = (await readBody(event)) || {}
  const { grant_type, code, client_id, client_secret, redirect_uri } = body

  if (grant_type !== 'authorization_code') {
    return oauthError(event, 'unsupported_grant_type')
  }
  if (!code || !client_id || !client_secret) {
    return oauthError(event, 'invalid_request')
  }

  // 1. 校验 client（secret 存的是 scrypt hash）
  const [client] = await db
    .select()
    .from(schema.oauthClients)
    .where(eq(schema.oauthClients.clientId, client_id))
    .limit(1)

  if (!client || !client.enabled) return oauthError(event, 'invalid_client')
  if (!(await verifyPassword(String(client_secret), client.clientSecret))) {
    return oauthError(event, 'invalid_client')
  }

  // 2. 校验 code：必须属于该 client、未用过、未过期
  const [row] = await db
    .select()
    .from(schema.oauthCodes)
    .where(and(eq(schema.oauthCodes.code, code), eq(schema.oauthCodes.clientId, client_id)))
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

  return {
    access_token: accessToken,
    token_type: 'Bearer',
    expires_in: 3600,
    sub: String(row.userId),
  }
})
