/**
 * SurveyKing API 客户端（走 LMS SSO 登录，不用 SurveyKing 密码）
 *
 * 为什么走 SSO：这个系统已经接了 LMS OIDC，本地密码登录被我们关掉了思路，
 * 而且我们也不知道它的密码。用「临时插一个 LMS 会话 token → 走完整 OAuth 流程
 * → 拿 sk-token」的方式，可以脚本化地以任意 LMS 用户身份操作。
 */
import postgres from 'postgres'
import { getProdUrl } from '../_prod-url.mjs'

export const SK = 'http://10.28.1.157'
export const LMS = 'http://10.28.1.151'

export async function createClient({ userId = 32 } = {}) {
  const jar = new Map()

  const saveCookies = (res) => {
    const list = typeof res.headers.getSetCookie === 'function' ? res.headers.getSetCookie() : []
    for (const c of list) {
      const [pair] = c.split(';')
      const idx = pair.indexOf('=')
      if (idx > 0) jar.set(pair.slice(0, idx).trim(), pair.slice(idx + 1).trim())
    }
  }

  const step = async (url, init = {}) => {
    const res = await fetch(url, {
      redirect: 'manual',
      ...init,
      headers: { ...(init.headers || {}), cookie: [...jar.entries()].map(([k, v]) => `${k}=${v}`).join('; ') },
    })
    saveCookies(res)
    return res
  }

  const sql = postgres(getProdUrl(), { max: 1 })
  const tokenName = `sk-cli-${Date.now()}`

  const close = async () => {
    await sql`delete from tokens where name = ${tokenName}`.catch(() => {})
    await sql.end({ timeout: 3 }).catch(() => {})
  }

  try {
    await sql`insert into tokens (name, user_id) values (${tokenName}, ${userId})`
    jar.set('auth_token', tokenName)

    const start = await step(`${SK}/api/public/oauth/login/google/start`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ redirect: '/' }),
    })
    const authUrl = (await start.json())?.data?.authorizationUrl
    if (!authUrl) throw new Error('发起授权失败')

    const authorize = await step(authUrl)
    const callbackUrl = authorize.headers.get('location') || ''
    if (!callbackUrl || callbackUrl.includes('oauthError')) {
      throw new Error(`LMS 授权失败：${callbackUrl || '无 Location'}`)
    }

    await step(callbackUrl)
    if (!jar.get('sk-token')) throw new Error('没拿到 sk-token（SSO 登录失败）')

    const me = await (await step(`${SK}/api/currentUser`)).json()
    const name = me?.data?.name
    if (!name) throw new Error(`currentUser 异常：${JSON.stringify(me).slice(0, 200)}`)

    return { step, userName: name, close }
  } catch (e) {
    await close()
    throw e
  }
}
