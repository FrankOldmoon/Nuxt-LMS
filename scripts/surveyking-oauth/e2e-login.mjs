/**
 * 端到端验证「LMS 账号登录」：未登录 → 点按钮 → LMS 认证 → 自动建号 → 进系统
 *
 * 覆盖的正是最容易坏的两环：
 *   1. 登录页是否只剩 LMS 按钮（账号密码表单被 CSS 藏掉）
 *   2. 问卷系统里**没有**对应账号时，能否自动建号直接进（不弹注册表单）
 *
 * 前提：registerInfo.registerEnabled 必须是 true，
 *   否则回调会返回 not_bound（提示「该第三方账号尚未绑定…」）。
 *   用 set-register.mjs 检查/校正。
 *
 * 用法：node scripts/surveyking-oauth/e2e-login.mjs [--lms-user test01] [--lms-pass REDACTED]
 */
import { chromium } from 'playwright-core'

const argv = process.argv.slice(2)
const opt = (n, d) => {
  const i = argv.indexOf(n)
  return i >= 0 ? argv[i + 1] : d
}
const LMS_USER = opt('--lms-user', 'test01')
const LMS_PASS = opt('--lms-pass', 'REDACTED')

const b = await chromium.launch({ channel: 'chrome', headless: true })
const ctx = await b.newContext({ viewport: { width: 1280, height: 900 } })
const p = await ctx.newPage()
const errs = []
p.on('pageerror', (e) => errs.push('pageerror: ' + e.message))

// 1. 打开问卷系统登录页（完全未登录）
await p.goto('http://10.28.1.157/user/login', { waitUntil: 'networkidle' })
await p.waitForTimeout(1500)
console.log('1) 登录页可见按钮:', JSON.stringify(await p.evaluate(() =>
  [...document.querySelectorAll('button')].filter((x) => x.offsetParent !== null).map((x) => x.innerText.trim()))))

// 2. 点「LMS 账号登录」
await p.locator('button', { hasText: /LMS/ }).click()
await p.waitForTimeout(3000)
console.log('2) 点击后 URL:', p.url())
console.log('   页面:', (await p.innerText('body')).replace(/\s+/g, ' ').slice(0, 120))

// 3. 在 LMS 登录页用 test01 登录（该账号在问卷系统里没有绑定）
if (p.url().includes('10.28.1.151')) {
  await p.locator('input[placeholder=Username]').fill(LMS_USER)
  await p.locator('input[placeholder=Password]').fill(LMS_PASS)
  await p.locator('button', { hasText: /^Login$/ }).click()
  console.log('3) 已在 LMS 提交登录:', LMS_USER)
  await p.waitForTimeout(6000)
}

// 4. 等回到问卷系统并完成自动建号
for (let i = 0; i < 15; i++) {
  if (p.url().includes('10.28.1.157') && !/login|register/.test(p.url())) break
  await p.waitForTimeout(1000)
}
await p.waitForTimeout(2500)

console.log('4) 最终 URL:', p.url())
const body = (await p.innerText('body')).replace(/\s+/g, ' ')
console.log('   页面文本:', body.slice(0, 240))
console.log('   前端错误:', errs.length ? errs.slice(0, 3) : '无 ✓')
await p.screenshot({ path: '/tmp/flow-result.png' })

// 5. 确认登录态
const me = await p.evaluate(async () => {
  const r = await fetch('/api/currentUser')
  const d = await r.json().catch(() => ({}))
  return { code: d.code, name: d.data?.name, email: d.data?.email, roles: (d.data?.authorityList || []).filter((a) => a.startsWith('ROLE_')) }
})
console.log('5) currentUser:', JSON.stringify(me))
await b.close()
