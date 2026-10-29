/** 验证：第一次访问会自动登录，第二次访问（已有会话）不再跳 */
import { chromium } from 'playwright-core'

const browser = await chromium.launch({ channel: 'chrome', headless: true })
const ctx = await browser.newContext()
await ctx.addCookies([{ name: 'auth_token', value: 'hydro-e2e', domain: '10.28.1.151', path: '/' }])
const page = await ctx.newPage()

const hops = []
page.on('response', (r) => {
  if (r.request().isNavigationRequest() && r.request().frame() === page.mainFrame()) {
    hops.push({ url: r.url(), status: r.status() })
  }
})

for (const round of [1, 2, 3]) {
  hops.length = 0
  const t0 = Date.now()
  await page.goto('http://10.28.1.155/p', { waitUntil: 'domcontentloaded', timeout: 45000 })
  await page.waitForTimeout(800)
  const body = (await page.innerText('body')).replace(/\s+/g, ' ')
  const name = (body.match(/Hydro\s+(\S+)/) || [])[1] || '?'
  console.log(`第 ${round} 次：${hops.length} 跳 / ${Date.now() - t0}ms / 用户 ${name}`)
  hops.forEach((h, i) => console.log(`   ${i + 1}. [${h.status}] ${h.url.replace(/[?&](state|code)=[^&]*/g, '').slice(0, 80)}`))
}
await browser.close()
