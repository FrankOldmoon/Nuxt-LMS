/**
 * OAuth 端点公共工具
 *
 * 错误返回遵循 RFC 6749：HTTP 400 + { error, error_description }。
 * 不用 cResp —— 外部系统（Hydro / oauth2-proxy）按标准字段解析，不看本站的 { code, msg, data } 包装。
 */

/** 返回标准 OAuth 错误（400） */
export function oauthError(event: any, error: string, description?: string) {
  setResponseStatus(event, 400)
  return description ? { error, error_description: description } : { error }
}

/** 返回 401（token 无效/过期） */
export function oauthUnauthorized(event: any, error = 'invalid_token') {
  setResponseStatus(event, 401)
  return { error }
}

/** 从 Authorization: Bearer xxx 中取出 token */
export function getBearerToken(event: any): string {
  const raw = getHeader(event, 'authorization') || ''
  const matched = raw.match(/^Bearer\s+(.+)$/i)
  return matched ? matched[1].trim() : ''
}
