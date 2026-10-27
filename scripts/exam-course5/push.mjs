/**
 * 把 exam.json 推到 SurveyKing（10.28.1.157）
 *
 * 鉴权走 LMS SSO（不需要 SurveyKing 的密码）：
 *   1. 在 LMS 生产库临时插一个会话 token（模拟"该用户已登录 LMS"）
 *   2. 走完整的 OAuth 流程拿 SurveyKing 的 sk-token
 *   3. POST /api/project/create 建卷
 *   4. 删掉临时会话
 *
 * 用法：
 *   node scripts/exam-course5/push.mjs --dry            # 只校验，不提交
 *   node scripts/exam-course5/push.mjs                  # 提交
 *   node scripts/exam-course5/push.mjs --user 34        # 用别的 LMS 账号（默认 32 = Frank Hu）
 */
import { readFileSync } from 'node:fs'
import postgres from 'postgres'
import { getProdUrl } from '../_prod-url.mjs'

const SK = 'http://10.28.1.157'
const LMS = 'http://10.28.1.151'
const CLIENT_ID = 'lms_c3af38a13ddd3acd'
const CALLBACK = `${SK}/api/public/oauth/callback/google`

const argv = process.argv.slice(2)
const opt = (n, d) => {
  const i = argv.indexOf(n)
  return i >= 0 ? argv[i + 1] : d
}
const dry = argv.includes('--dry')
const userId = Number(opt('--user', '32'))
const file = opt('--file', new URL('./exam.json', import.meta.url).pathname)
const deleteId = opt('--delete', '')

// ---------------------------------------------------------------- cookie jar
const jar = new Map()
function saveCookies(res) {
  const list = typeof res.headers.getSetCookie === 'function' ? res.headers.getSetCookie() : []
  for (const c of list) {
    const [pair] = c.split(';')
    const idx = pair.indexOf('=')
    const name = pair.slice(0, idx).trim()
    const value = pair.slice(idx + 1).trim()
    jar.set(name, value)
  }
}
function cookieHeader() {
  return [...jar.entries()].map(([k, v]) => `${k}=${v}`).join('; ')
}

async function step(url, init = {}) {
  const res = await fetch(url, {
    redirect: 'manual',
    ...init,
    headers: { ...(init.headers || {}), cookie: cookieHeader() },
  })
  saveCookies(res)
  return res
}

// ---------------------------------------------------------------- 主流程
const exam = JSON.parse(readFileSync(file, 'utf8'))
const qs = exam.survey.children.filter((c) => ['Radio', 'Checkbox', 'FillBlank'].includes(c.type))
// 填空题的分值挂在"空"子节点上（判分器按 option 求和）
const scoreOf = (q) =>
  q.type === 'FillBlank' ? q.children?.[0]?.attribute?.examScore || 0 : q.attribute?.examScore || 0
const score = qs.reduce((s, q) => s + scoreOf(q), 0)
console.log(`试卷：${exam.name}`)
console.log(
  `  ${qs.length} 题（单选 ${qs.filter((q) => q.type === 'Radio').length} / 多选 ${qs.filter((q) => q.type === 'Checkbox').length} / 填空 ${qs.filter((q) => q.type === 'FillBlank').length}），总分 ${score}`,
)
if (dry) {
  console.log('\n[dry] 不提交')
  process.exit(0)
}

const sql = postgres(getProdUrl(), { max: 1 })
const tokenName = `sk-exam-push-${Date.now()}`
let projectId = ''
try {
  // 1. LMS 侧临时会话
  await sql`insert into tokens (name, user_id) values (${tokenName}, ${userId})`
  jar.set('auth_token', tokenName)

  // 2. 发起授权
  const start = await step(`${SK}/api/public/oauth/login/google/start`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ redirect: '/' }),
  })
  const startBody = await start.json()
  const authUrl = startBody?.data?.authorizationUrl
  if (!authUrl) throw new Error(`发起授权失败：${JSON.stringify(startBody)}`)

  // 3. LMS 授权（已登录 → 直接回跳）
  const authorize = await step(authUrl)
  const callbackUrl = authorize.headers.get('location')
  if (!callbackUrl || callbackUrl.includes('oauthError')) {
    throw new Error(`LMS 授权失败：${callbackUrl}`)
  }

  // 4. 回调换 sk-token
  await step(callbackUrl)
  if (!jar.get('sk-token')) throw new Error('没拿到 sk-token，SSO 登录失败')

  // 5. 确认身份
  const me = await (await step(`${SK}/api/currentUser`)).json()
  const meName = me?.data?.name
  if (!meName) throw new Error(`currentUser 异常：${JSON.stringify(me).slice(0, 200)}`)
  console.log(`  以 ${meName} 身份登录 SurveyKing ✓`)

  // 6. 建卷
  const create = await step(`${SK}/api/project/create`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(exam),
  })
  const createBody = await create.json().catch(() => ({}))
  if (createBody?.code !== 200) {
    throw new Error(`建卷失败 HTTP ${create.status}：${JSON.stringify(createBody).slice(0, 400)}`)
  }
  projectId = createBody?.data?.id || ''
  console.log(`  建卷成功 ✓ id=${projectId}`)
  console.log(`  编辑：${SK}/project/${projectId}`)
  console.log(`  填写：${SK}/s/${projectId}`)

  // 顺手删掉旧卷（--delete 指定）
  if (deleteId) {
    // 注意：后端 deleteProject 用的是 request.getId()，不是 ids 数组，传 ids 会 NPE
    const del = await step(`${SK}/api/project/delete`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ id: deleteId }),
    })
    const db = await del.json().catch(() => ({}))
    console.log(db?.code === 200 ? `  旧卷 ${deleteId} 已删除 ✓` : `  旧卷删除失败：${JSON.stringify(db).slice(0, 120)}`)
  }
} catch (e) {
  console.error('\n❌', e.message)
  process.exitCode = 1
} finally {
  await sql`delete from tokens where name = ${tokenName}`
  await sql.end({ timeout: 3 })
  console.log('  临时会话已清理')
}
