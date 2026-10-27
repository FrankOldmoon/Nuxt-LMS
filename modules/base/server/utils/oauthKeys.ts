/**
 * LMS 作为 OIDC Provider 的 id_token 签名密钥
 *
 * 为什么要 RSA 而不是一开始的 HS256：
 *   - Gitea 走 goth，只解码不验签，HS256 够用；
 *   - 但 SurveyKing 走 Spring Security 的 NimbusJwtDecoder，
 *     它**必须**拿 JWKS 里的公钥验签，HS256 直接不支持。
 *   - 将来接 oauth2-proxy 这类强制验签的客户端同理。
 *   所以统一用 RS256 + 暴露 JWKS。
 *
 * 密钥来源优先级：
 *   1. 环境变量 NUXT_OAUTH_ID_PRIVATE_KEY（base64 的 PKCS8 PEM，或直接 PEM）
 *   2. configs 表 `site:oauth.idPrivateKey`
 *   3. 都没有 → 现场生成 RSA-2048 并写进 configs 表（重启后不变）
 *
 * 私钥进 DB 是有意的取舍：LMS 的 DB 已经是核心资产，而放文件里
 * 要先确认 .data 目录在生产环境是否持久（NuxtHub 会清 .data/db）。
 */
import { createHash, createPublicKey, createSign, generateKeyPairSync } from 'node:crypto'
import { db, schema } from '@nuxthub/db'

export interface IdTokenKey {
  kid: string
  privateKeyPem: string
  /** 公钥 JWK（RFC 7517），直接塞进 JWKS 响应 */
  jwk: Record<string, any>
}

let _cached: IdTokenKey | null = null

function decodePem(raw: string): string {
  const value = raw.trim()
  if (!value) return ''
  if (value.includes('-----BEGIN')) return value
  try {
    return Buffer.from(value, 'base64').toString('utf8')
  } catch {
    return ''
  }
}

function buildKey(privateKeyPem: string): IdTokenKey {
  const publicKey = createPublicKey(privateKeyPem)
  const jwk = publicKey.export({ format: 'jwk' }) as Record<string, any>
  const kid = createHash('sha256').update(publicKey.export({ type: 'spki', format: 'der' }) as Buffer)
    .digest('hex')
    .slice(0, 16)
  return {
    kid,
    privateKeyPem,
    jwk: { ...jwk, kid, use: 'sig', alg: 'RS256' },
  }
}

/** 取（必要时生成）id_token 签名密钥 */
export async function getIdTokenKey(): Promise<IdTokenKey> {
  if (_cached) return _cached

  let pem = decodePem(String(process.env.NUXT_OAUTH_ID_PRIVATE_KEY || ''))
  if (!pem) pem = decodePem(String(getConfigSync('site:oauth.idPrivateKey') || ''))

  if (!pem) {
    const { privateKey } = generateKeyPairSync('rsa', {
      modulusLength: 2048,
      privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
      publicKeyEncoding: { type: 'spki', format: 'pem' },
    })
    pem = privateKey
    try {
      await db
        .insert(schema.configs)
        .values({ id: 'site:oauth.idPrivateKey', value: pem })
        .onConflictDoNothing()
    } catch (e) {
      // 落库失败不影响本次启动用内存里的密钥，只是重启后会换一把
      console.error('[oauth] id_token 私钥写入 configs 失败', e)
    }
    console.log('[oauth] 已生成新的 id_token RSA 签名密钥')
  }

  _cached = buildKey(pem)
  return _cached
}

/** RS256 签名，返回 JWT */
export async function signIdTokenRs256(payload: Record<string, any>): Promise<string> {
  const key = await getIdTokenKey()
  const b64 = (obj: any) => Buffer.from(JSON.stringify(obj)).toString('base64url')
  const head = b64({ alg: 'RS256', typ: 'JWT', kid: key.kid })
  const body = b64(payload)
  const signer = createSign('RSA-SHA256')
  signer.update(`${head}.${body}`)
  const sig = signer.sign(key.privateKeyPem).toString('base64url')
  return `${head}.${body}.${sig}`
}

/** JWKS 响应体 */
export async function getJwks(): Promise<Record<string, any>> {
  const key = await getIdTokenKey()
  return { keys: [key.jwk] }
}
