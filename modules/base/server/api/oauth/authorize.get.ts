import { db, schema } from '@nuxthub/db'
import { and, eq, lt } from 'drizzle-orm'

/**
 * OAuth 授权端点（授权码模式）
 *
 * GET /api/oauth/authorize?response_type=code&client_id=xxx&redirect_uri=xxx&state=xxx
 *
 * - client / redirect_uri 不合法时直接 400，**绝不重定向**（否则就是开放重定向）
 * - 未登录 → 302 到 /oauth/login?redirect=<本 URL>，登录成功后原样回来
 * - 已登录 → 签发 60 秒一次性 code 并 302 回 redirect_uri
 */
export default defineEventHandler(async (event) => {
  const url = getRequestURL(event)
  const q = getQuery(event) as Record<string, string>
  const { client_id, redirect_uri, state = '', response_type, nonce = '', code_challenge = '' } = q

  // 1. 校验 client 与回调地址（精确匹配，不做前缀匹配）
  const [client] = client_id
    ? await db
        .select()
        .from(schema.oauthClients)
        .where(and(eq(schema.oauthClients.clientId, client_id), eq(schema.oauthClients.enabled, true)))
        .limit(1)
    : []

  const allowed = (client?.redirectUris as string[] | null) || []
  if (!client || response_type !== 'code' || !redirect_uri || !allowed.includes(redirect_uri)) {
    return oauthError(event, 'invalid_request', 'unknown client_id or redirect_uri not allowed')
  }

  // 2. 未登录：把当前完整 URL 作为回跳目标
  const user = await getCurrentUser(event)
  if (!user) {
    const self = url.pathname + url.search
    return sendRedirect(event, `/oauth/login?redirect=${encodeURIComponent(self)}`)
  }

  // 3. 顺手清理过期 code，避免表无限增长
  await db.delete(schema.oauthCodes).where(lt(schema.oauthCodes.expiresAt, new Date()))

  // 4. 签发一次性 code（60 秒）
  //    nonce / code_challenge 随 code 一起存，换 token 时再校验：
  //    - nonce：OIDC 客户端（SurveyKing）会校验 id_token 里的 nonce 与授权请求一致
  //    - code_challenge：PKCE，客户端在换 token 时带 code_verifier，必须匹配
  const code = generateToken()
  await db.insert(schema.oauthCodes).values({
    code,
    clientId: client_id,
    userId: user.id,
    redirectUri: redirect_uri,
    nonce: nonce || null,
    codeChallenge: code_challenge || null,
    expiresAt: new Date(Date.now() + 60_000),
  })

  const sep = redirect_uri.includes('?') ? '&' : '?'
  return sendRedirect(
    event,
    `${redirect_uri}${sep}code=${encodeURIComponent(code)}&state=${encodeURIComponent(state)}`,
  )
})
