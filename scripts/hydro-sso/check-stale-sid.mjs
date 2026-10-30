/**
 * 复现并验证「旧 sid 残留在浏览器里」的场景
 * （这是 Frank 遇到的情况：151 已登录，但 155 显示未登录）
 */
import { chromium } from 'playwright-core'

const browser = await chromium.launch({ channel: 'chrome', headless: true })
const ctx = await browser.newContext()
// 模拟：之前访问过 155（留下 sid），但没登录过（没有 hydro_uid）
await ctx.addCookies([
  { name: 'auth_token', value: 'hydro-e2e', domain: '10.28.1.151', path: '/' },
  { name: 'sid', value: 'staleSessionFromBefore', domain: '10.28.1.155', path: '/' },
])
const page = await ctx.newPage()
const hops = []
page.on('response', (r) => {
  if (r.request().isNavigationRequest() && r.request().frame() === page.mainFrame()) {
    hops.push(`[${r.status()}] ${r.url().replace(/[?&](state|code)=[^&]*/g, '').slice(0, 70)}`)
  }
})

await page.goto('http://10.28.1.155/p', { waitUntil: 'domcontentloaded', timeout: 45000 })
await page.waitForTimeout(1000)

console.log('跳转链:')
hops.forEach((h, i) => console.log(`  ${i + 1}. ${h}`))
const body = (await page.innerText('body')).replace(/\s+/g, ' ')
const name = (body.match(/Hydro\s+(\S+)/) || [])[1]
console.log('\n最终 URL:', page.url())
console.log('登录用户:', name || '❌ 未登录')
const cs = (await ctx.cookies()).filter((c) => c.domain.includes('155'))
console.log('155 的 cookie:', cs.map((c) => c.name).join(', '))
await browser.close()
