/**
 * OIDC Discovery 文档
 *
 * GET /api/oauth/openid-configuration
 *
 * 为什么不用标准的 /.well-known/openid-configuration：
 *   Nitro 的路由扫描会跳过以点开头的目录，放在 server/routes/.well-known/ 下不会被注册；
 *   而 Gitea 的 goth 是直接 GET 传入的整个 URL（见 goth/providers/openidConnect 的
 *   getOpenIDConfig），不拼 /.well-known/ 后缀，所以端点放哪条路径都行。
 *
 * 要不要给 Gitea 这个 URL：
 *   gitea admin auth add-oauth --provider openidConnect --auto-discover-url <本 URL>
 */
export default defineEventHandler((event) => {
  const issuer = oauthIssuer(event)

  setHeader(event, 'cache-control', 'public, max-age=300')

  return {
    issuer,
    authorization_endpoint: `${issuer}/api/oauth/authorize`,
    token_endpoint: `${issuer}/api/oauth/token`,
    userinfo_endpoint: `${issuer}/api/oauth/userinfo`,

    response_types_supported: ['code'],
    grant_types_supported: ['authorization_code'],
    subject_types_supported: ['public'],
    // 没有 JWKS：id_token 用 HS256 + client_secret 签名。
    // 目前接入方（Gitea）只校验 iss/aud/exp、不验签；将来接 oauth2-proxy 这类
    // 强制验签的客户端时，要改成 RS256 并补 /api/oauth/jwks。
    id_token_signing_alg_values_supported: ['HS256'],
    token_endpoint_auth_methods_supported: ['client_secret_post', 'client_secret_basic'],
    scopes_supported: ['openid', 'profile', 'email'],
    claims_supported: [
      'sub',
      'name',
      'nickname',
      'preferred_username',
      'email',
      'email_verified',
      'picture',
    ],
  }
})
