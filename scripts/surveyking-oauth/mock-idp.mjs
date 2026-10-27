#!/usr/bin/env node
/**
 * 模拟 LMS 的 OIDC 端点（专门给 SurveyKing 端到端测试用）
 *
 * 为什么需要它
 * ------------
 * SurveyKing 走 openidConnect provider，要的是**完整 OIDC**：
 *   authorize（带 nonce + PKCE）→ token（校验 code_verifier）→ id_token（RS256，iss/aud/nonce/email_verified）
 * 而 LMS 生产环境部署新代码前，旧的 token 端点不签 id_token 的 nonce、
 * 也没有 JWKS，SurveyKing 会判 invalid_identity。
 * 于是用这个 mock 把「SurveyKing 侧」的逻辑独立验证掉，不必等 LMS 部署。
 *
 * 用法：
 *   node scripts/surveyking-oauth/mock-idp.mjs --port 3999 --sub-file /tmp/mock-sub
 *   echo 34 > /tmp/mock-sub        # 切换成另一个 LMS 用户（sub = LMS users.id）
 *
 * 然后把 SurveyKing 的补丁 jar 指向本机：
 *   --issuer http://<本机IP>:3999
 *   --authorize http://<本机IP>:3999/api/oauth/authorize
 *   --token http://<本机IP>:3999/api/oauth/token
 *   --jwks http://<本机IP>:3999/api/oauth/jwks
 */
import { createServer } from 'node:http'
import { createHash, createPublicKey, createSign, generateKeyPairSync, randomBytes } from 'node:crypto'
import { readFileSync } from 'node:fs'

const args = process.argv.slice(2)
const opt = (name, dflt) => {
  const i = args.indexOf(name)
  return i >= 0 ? args[i + 1] : dflt
}
const PORT = Number(opt('--port', '3999'))
const SUB_FILE = opt('--sub-file', '/tmp/mock-sub')
const ISSUER = opt('--issuer', `http://127.0.0.1:${PORT}`)
const EMAIL = opt('--email', 'mock@minxinnansha.org.cn')
const NAME = opt('--name', 'Mock User')

const { privateKey, publicKey } = generateKeyPairSync('rsa', {
  modulusLength: 2048,
  privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
  publicKeyEncoding: { type: 'spki', format: 'pem' },
})
const jwk = { ...createPublicKey(publicKey).export({ format: 'jwk' }), use: 'sig', alg: 'RS256' }
const kid = 'mockkey1'

const codes = new Map()

function readSub() {
  try {
    return String(readFileSync(SUB_FILE, 'utf8')).trim() || '1'
  } catch {
    return '1'
  }
}

function b64url(obj) {
  return Buffer.from(JSON.stringify(obj)).toString('base64url')
}

function signJwt(payload) {
  const head = b64url({ alg: 'RS256', typ: 'JWT', kid })
  const body = b64url(payload)
  const signer = createSign('RSA-SHA256')
  signer.update(`${head}.${body}`)
  return `${head}.${body}.${signer.sign(privateKey).toString('base64url')}`
}

const server = createServer((req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`)

  if (url.pathname === '/api/oauth/jwks') {
    res.writeHead(200, { 'content-type': 'application/json' })
    res.end(JSON.stringify({ keys: [{ ...jwk, kid }] }))
    return
  }

  if (url.pathname === '/api/oauth/authorize') {
    const q = url.searchParams
    const code = randomBytes(16).toString('hex')
    codes.set(code, {
      nonce: q.get('nonce') || '',
      codeChallenge: q.get('code_challenge') || '',
      redirectUri: q.get('redirect_uri') || '',
      clientId: q.get('client_id') || '',
      sub: readSub(),
    })
    const sep = q.get('redirect_uri').includes('?') ? '&' : '?'
    console.log(`[mock] authorize sub=${readSub()} client=${q.get('client_id')}`)
    res.writeHead(302, { location: `${q.get('redirect_uri')}${sep}code=${code}&state=${q.get('state') || ''}` })
    res.end()
    return
  }

  if (url.pathname === '/api/oauth/token' && req.method === 'POST') {
    let raw = ''
    req.on('data', (c) => (raw += c))
    req.on('end', () => {
      const form = new URLSearchParams(raw)
      const rec = codes.get(form.get('code'))
      if (!rec) {
        res.writeHead(400, { 'content-type': 'application/json' })
        res.end(JSON.stringify({ error: 'invalid_grant' }))
        return
      }
      codes.delete(form.get('code'))

      // 校验 PKCE
      if (rec.codeChallenge) {
        const digest = createHash('sha256').update(form.get('code_verifier') || '').digest('base64url')
        if (digest !== rec.codeChallenge) {
          res.writeHead(400, { 'content-type': 'application/json' })
          res.end(JSON.stringify({ error: 'invalid_grant', error_description: 'code_verifier mismatch' }))
          return
        }
      }

      const now = Math.floor(Date.now() / 1000)
      const idToken = signJwt({
        iss: ISSUER,
        sub: rec.sub,
        aud: rec.clientId,
        iat: now,
        exp: now + 3600,
        nonce: rec.nonce,
        name: NAME,
        nickname: NAME,
        email: EMAIL,
        email_verified: true,
      })
      console.log(`[mock] token sub=${rec.sub} aud=${rec.clientId}`)
      res.writeHead(200, { 'content-type': 'application/json' })
      res.end(JSON.stringify({ access_token: randomBytes(16).toString('hex'), token_type: 'Bearer', expires_in: 3600, id_token: idToken }))
    })
    return
  }

  res.writeHead(404)
  res.end('not found')
})

server.listen(PORT, '0.0.0.0', () => {
  console.log(`[mock] 模拟 LMS OIDC 端点已启动：${ISSUER}`)
  console.log(`[mock] 当前 sub：${readSub()}（改 ${SUB_FILE} 即可切换用户）`)
})
