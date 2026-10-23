/**
 * OAuth / OIDC 端点公共工具
 *
 * 错误返回遵循 RFC 6749：HTTP 400 + { error, error_description }。
 * 不用 cResp —— 外部系统（Hydro / Gitea / oauth2-proxy）按标准字段解析，不看本站的 { code, msg, data } 包装。
 */
import { createHmac } from 'node:crypto'

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

/**
 * 取出 client 凭证，同时支持两种传法（RFC 6749 §2.3.1）
 *
 * - client_secret_post：body 里的 client_id / client_secret
 * - client_secret_basic：Authorization: Basic base64(urlencode(id):urlencode(secret))
 *
 * Golang 的 x/oauth2（Gitea、oauth2-proxy 都用它）默认先试 basic、失败再回落 post，
 * 只认 body 也能跑通，但会白跑一次请求；两种都认更稳。
 */
export function getClientCredentials(event: any, body: Record<string, any>) {
  const raw = getHeader(event, 'authorization') || ''
  const matched = raw.match(/^Basic\s+(.+)$/i)
  if (matched) {
    const decoded = Buffer.from(matched[1], 'base64').toString('utf8')
    const idx = decoded.indexOf(':')
    if (idx >= 0) {
      return {
        clientId: decodeURIComponent(decoded.slice(0, idx)),
        clientSecret: decodeURIComponent(decoded.slice(idx + 1)),
      }
    }
  }
  return {
    clientId: String(body.client_id || ''),
    clientSecret: String(body.client_secret || ''),
  }
}

/**
 * OIDC issuer / 端点基址
 *
 * 优先读 site:oauth.issuer 配置（反代没透传 Host 时用来兜底修正），
 * 否则用请求的真实 origin。discovery、id_token 的 iss、端点 URL 三处必须同源，
 * 否则客户端校验 `iss` 会失败。
 */
export function oauthIssuer(event: any): string {
  const configured = String(getConfigSync('site:oauth.issuer') || '').trim()
  const base = configured || getRequestURL(event).origin
  return base.replace(/\/+$/, '')
}

/** HS256 签发 id_token（客户端不验签，但签名保证不被第三方伪造） */
export function signIdToken(payload: Record<string, any>, secret: string): string {
  const b64 = (obj: any) => Buffer.from(JSON.stringify(obj)).toString('base64url')
  const head = b64({ alg: 'HS256', typ: 'JWT' })
  const body = b64(payload)
  const sig = createHmac('sha256', secret).update(`${head}.${body}`).digest('base64url')
  return `${head}.${body}.${sig}`
}
