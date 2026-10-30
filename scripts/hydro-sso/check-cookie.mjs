/** 验证 hydro_uid 标记的种入与登出后的行为 */
import { chromium } from 'playwright-core'

const browser = await chromium.launch({ channel: 'chrome', headless: true })
const ctx = await browser.newContext()
await ctx.addCookies([{ name: 'auth_token', value: 'hydro-e2e', domain: '10.28.1.151', path: '/' }])
const page = await ctx.newPage()

const show = async (label) => {
  const cs = (await ctx.cookies()).filter((c) => c.domain.includes('155'))
  console.log(`  ${label}: ${cs.map((c) => `${c.name}=${c.value.slice(0, 12)}`).join(' / ') || '(无)'}`)
}

await page.goto('http://10.28.1.155/p', { waitUntil: 'domcontentloaded' })
await page.waitForTimeout(800)
console.log('登录后 cookie:')
await show('  →')

// 登出
await page.goto('http://10.28.1.155/logout', { waitUntil: 'domcontentloaded' }).catch(() => {})
await page.waitForTimeout(1500)
console.log('\n点击登出后:')
await show('  →')
console.log('  页面:', (await page.innerText('body')).replace(/\s+/g, ' ').slice(0, 80))

// 登出后再访问（静默期内不应被自动登回去）
await page.goto('http://10.28.1.155/p', { waitUntil: 'domcontentloaded' })
await page.waitForTimeout(800)
const body = (await page.innerText('body')).replace(/\s+/g, ' ')
console.log('\n登出后再访问:')
console.log('  URL:', page.url())
console.log('  是否仍登出:', !/Logout/i.test(body) ? '✅ 保持登出' : '⚠️ 被自动登回去了')

await browser.close()
