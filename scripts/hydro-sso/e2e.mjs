/**
 * 验证 155（Hydro）的自动 SSO：LMS 已登录时访问 155 应该无感登录
 *
 * 用法：
 *   node scripts/hydro-sso/e2e.mjs                    # 场景 1：LMS 已登录 → 自动进
 *   node scripts/hydro-sso/e2e.mjs --no-lms           # 场景 2：LMS 未登录 → 显示登录页
 *   node scripts/hydro-sso/e2e.mjs --path /p          # 指定路径
 *   node scripts/hydro-sso/e2e.mjs --token hydro-e2e  # 指定 LMS 会话 token
 */
import { chromium } from 'playwright-core'

const argv = process.argv.slice(2)
const opt = (n, d) => { const i = argv.indexOf(n); return i >= 0 ? argv[i + 1] : d }
const useLms = !argv.includes('--no-lms')
const path = opt('--path', '/p')
const token = opt('--token', 'hydro-e2e')

const browser = await chromium.launch({ channel: 'chrome', headless: true })
const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } })
if (useLms) {
  await ctx.addCookies([{ name: 'auth_token', value: token, domain: '10.28.1.151', path: '/' }])
}
const page = await ctx.newPage()

// 记录每一次顶层导航（302 链也算）
const hops = []
page.on('response', async (r) => {
  const req = r.request()
  if (req.isNavigationRequest() && req.frame() === page.mainFrame()) {
    hops.push({ url: r.url(), status: r.status(), to: r.headers().location || '' })
  }
})

const t0 = Date.now()
await page.goto(`http://10.28.1.155${path}`, { waitUntil: 'domcontentloaded', timeout: 45000 })
await page.waitForTimeout(1500)
const ms = Date.now() - t0

console.log(`\n场景：${useLms ? 'LMS 已登录' : 'LMS 未登录'}　路径 ${path}\n`)
console.log(`跳转链（${ms}ms）：`)
hops.forEach((h, i) => {
  const to = h.to ? ` → ${h.to.replace(/state=[^&]+|code=[^&]+/g, '…').slice(0, 95)}` : ''
  console.log(`  ${i + 1}. [${h.status}] ${h.url.replace(/state=[^&]+|code=[^&]+/g, '…').slice(0, 95)}${to}`)
})

const body = (await page.innerText('body')).replace(/\s+/g, ' ').slice(0, 180)
const loggedIn = /Logout|登出|退出/.test(body) || /Hydro\s+\S+/.test(body) && !/Login\s*$/.test(body)
console.log(`\n最终 URL: ${page.url()}`)
console.log(`页面文本: ${body}`)
console.log(`\n判定: ${loggedIn ? '✅ 已登录' : '⚠️ 未登录（应停在登录页）'}`)
await page.screenshot({ path: `/tmp/hydro-sso-${useLms ? 'in' : 'out'}.png` })
await browser.close()
