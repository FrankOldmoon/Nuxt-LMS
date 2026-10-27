/**
 * OIDC JWKS（公钥集合）
 *
 * GET /api/oauth/jwks
 *
 * 客户端（如 SurveyKing 的 NimbusJwtDecoder）拿这里的公钥验证 id_token 的 RS256 签名。
 * 私钥不出现在响应里。
 */
export default defineEventHandler(async (event) => {
  setHeader(event, 'cache-control', 'public, max-age=300')
  return await getJwks()
})
