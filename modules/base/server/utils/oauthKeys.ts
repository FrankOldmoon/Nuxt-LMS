/**
 * LMS 作为 OIDC Provider 的 id_token 签名密钥
 *
 * 为什么要 RSA 而不是一开始的 HS256：
 *   - Gitea 走 goth，只解码不验签，HS256 够用；
 *   - 但 SurveyKing 走 Spring Security 的 NimbusJwtDecoder，
 *     它**必须**拿 JWKS 里的公钥验签，HS256 直接不支持；
 *   - 将来接 oauth2-proxy 这类强制验签的客户端同理。
 *   所以统一用 RS256 + 暴露 JWKS。
 *
 * 密钥来源优先级：
 *   1. 环境变量 NUXT_OAUTH_ID_PRIVATE_KEY（base64 的 PKCS8 PEM，或直接 PEM）
 *   2. configs 表 `site:oauth.idPrivateKey`（**以数据库为准**）
 *   3. 都没有 → 现场生成 RSA-2048，写进 configs 表
 *
 * 为什么必须以数据库为准（2026-10-27 踩的坑）
 * ------------------------------------------
 * 生产是 nginx + **8 个 fork 进程**（见 ecosystem.config.cjs 与
 * utils/config/version.ts 的注释）。之前把密钥缓存在模块级变量里，结果：
 *   - 8 个进程各自生成一把 → JWKS 的 kid 与 id_token 的 kid 不一致
 *     → 客户端（Nimbus）按 kid 找不到公钥 → 验签失败 → 登录报 invalid_identity；
 *   - 更阴的是「进程已经缓存过」，之后即使把正确密钥写进库，
 *     它仍然用自己那把旧的（模块级变量不会失效），
 *     只能重启全部进程才能对齐。
 * 另外写入用的是 onConflictDoNothing，而该行早被 defaults 播种成空串，
 * 于是私钥**永远写不进去**，每次调用都重新生成一把。
 *
 * 现在的策略：**每次都从库里读**，进程内不缓存（一次主键查询，可忽略）；
 * 写入用 upsert，写完重读，保证并发下所有进程最终用的是同一把。
 *
 * 私钥进 DB 是有意的取舍：LMS 的 DB 已经是核心资产，而放文件里
 * 要先确认 .data 目录在生产环境是否持久（NuxtHub 会清 .data/db）。
 */
import { createHash, createPublicKey, createSign, generateKeyPairSync } from 'node:crypto'
import { db, schema } from '@nuxthub/db'
import { eq } from 'drizzle-orm'

export interface IdTokenKey {
  kid: string
  privateKeyPem: string
  /** 公钥 JWK（RFC 7517），直接塞进 JWKS 响应 */
  jwk: Record<string, any>
}

/** configs 表里的键名 */
const KEY_ID = 'site:oauth.idPrivateKey'

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
  const kid = createHash('sha256')
    .update(publicKey.export({ type: 'spki', format: 'der' }) as Buffer)
    .digest('hex')
    .slice(0, 16)
  return {
    kid,
    privateKeyPem,
    jwk: { ...jwk, kid, use: 'sig', alg: 'RS256' },
  }
}

/** 从库里读已存的私钥（没有就返回空串） */
async function readStoredKey(): Promise<string> {
  try {
    const rows = await db
      .select({ value: schema.configs.value })
      .from(schema.configs)
      .where(eq(schema.configs.id, KEY_ID))
      .limit(1)
    return decodePem(String(rows[0]?.value ?? ''))
  } catch (e) {
    console.error('[oauth] 读取 id_token 私钥失败', e)
    return ''
  }
}

/** 取 id_token 签名密钥（每次都从库读，保证多个进程一致） */
export async function getIdTokenKey(): Promise<IdTokenKey> {
  // 1) 环境变量优先（运维可以完全绕开数据库）
  const fromEnv = decodePem(String(process.env.NUXT_OAUTH_ID_PRIVATE_KEY || ''))
  if (fromEnv) return buildKey(fromEnv)

  // 2) 数据库 —— 多进程共享的唯一真相来源
  const stored = await readStoredKey()
  if (stored) return buildKey(stored)

  // 3) 首次：生成 → 落库 → **重读**（用最终生效的那把）
  //    onConflictDoUpdate 是必须的：这一行可能已由 defaults 播种成空串，
  //    用 onConflictDoNothing 的话私钥永远写不进去。
  const { privateKey } = generateKeyPairSync('rsa', {
    modulusLength: 2048,
    privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
    publicKeyEncoding: { type: 'spki', format: 'pem' },
  })
  try {
    await db
      .insert(schema.configs)
      .values({ id: KEY_ID, value: privateKey })
      .onConflictDoUpdate({ target: schema.configs.id, set: { value: privateKey } })
  } catch (e) {
    console.error('[oauth] id_token 私钥写入 configs 失败', e)
  }
  // 重读：并发时可能有别的进程先写入了，以库里实际生效的为准
  const finalPem = (await readStoredKey()) || privateKey
  console.log('[oauth] 已生成 id_token RSA 签名密钥')
  return buildKey(finalPem)
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
