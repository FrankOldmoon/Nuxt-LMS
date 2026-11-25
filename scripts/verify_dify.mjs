import { chromium } from '/Users/oldmoon/Documents/ubuntu/nuxt_lms_2026/node_modules/playwright-core/index.mjs'

const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
const base = 'http://127.0.0.1:3004'
const TEST_USER = process.env.TEST_USER || 'test02'
const TEST_PASS = process.env.TEST_PASSWORD || ''
if (!TEST_PASS) {
  console.error('缺少 TEST_PASSWORD 环境变量（test 账号密码）')
  process.exit(1)
}

const browser = await chromium.launch({ executablePath: CHROME, headless: true })
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } })

page.on('console', (m) => { if (m.type() === 'error') console.log('[console.error]', m.text().slice(0, 250)) })
page.on('pageerror', (e) => console.log('[pageerror]', String(e).slice(0, 300)))

try {
  await page.goto(`${base}/course/2/56`, { waitUntil: 'domcontentloaded', timeout: 60000 })
  await page.waitForTimeout(6000)
  console.log('标题:', (await page.title()).slice(0, 80))

  // 未登录则登录
  const loginBtn = page.locator('button:has-text("登录"), button:has-text("Log in"), button:has-text("Login")').first()
  if (await loginBtn.count()) {
    console.log('→ 未登录，点击登录按钮')
    await loginBtn.click()
    await page.waitForTimeout(1500)

    const uname = page.locator('input[placeholder*="用户名"], input[placeholder*="Username"], input[autocomplete="username"]').first()
    const pwd = page.locator('input[placeholder*="密码"], input[placeholder*="Password"], input[autocomplete="current-password"]').first()
    if (await uname.count() === 0 || await pwd.count() === 0) {
      console.log('!! 找不到登录输入框，截图保存')
      await page.screenshot({ path: '/tmp/dify_check.png' })
      process.exit(1)
    }
    await uname.fill(TEST_USER)
    await pwd.fill(TEST_PASS)
    await page.locator('button[type="submit"]').first().click()
    await page.waitForTimeout(5000)
    console.log('→ 已提交登录')
  } else {
    console.log('→ 已登录（未显示登录按钮）')
  }

  // 检查 Dify 注入
  const script = await page.evaluate(() => !!document.getElementById('dify-chatbot-script'))
  const bubble = await page.evaluate(() => !!document.getElementById('dify-chatbot-bubble-button'))
  const cfg = await page.evaluate(() => {
    const c = window.difyChatbotConfig
    return c ? { token: c.token, baseUrl: c.baseUrl, user_id: c.systemVariables?.user_id } : null
  })
  const probe = await page.evaluate(() => ({
    layout: !!document.getElementById('layout-probe'),
    dify: !!document.getElementById('dify-mount-probe'),
    app: document.getElementById('__nuxt') ? 'nuxt-app' : 'no-nuxt',
  }))
  console.log('登录后 → dify script:', script, '| bubble:', bubble, '| config:', JSON.stringify(cfg))
  console.log('DOM 探针:', JSON.stringify(probe))

  // 检查组件是否挂载（找注释节点）
  const mountNote = await page.evaluate(() => {
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_COMMENT)
    const found = []
    while (walker.nextNode() && found.length < 3) found.push(walker.currentNode.nodeValue?.trim().slice(0, 50))
    return found
  })
  console.log('页面注释节点:', JSON.stringify(mountNote))

  // 刷新后检查（SSR 后 immediate watch 应注入）
  await page.reload({ waitUntil: 'domcontentloaded' })
  await page.waitForTimeout(5000)
  const script2 = await page.evaluate(() => !!document.getElementById('dify-chatbot-script'))
  const bubble2 = await page.evaluate(() => !!document.getElementById('dify-chatbot-bubble-button'))
  const cfg2 = await page.evaluate(() => (window.difyChatbotConfig ? 'set' : 'null'))
  console.log('刷新后 → dify script:', script2, '| bubble:', bubble2, '| config:', cfg2)

  // 若气泡存在，点开看看
  if (bubble) {
    await page.locator('#dify-chatbot-bubble-button').click({ timeout: 3000 }).catch(() => {})
    await page.waitForTimeout(2500)
  }
  await page.screenshot({ path: '/tmp/dify_check.png' })
  console.log('截图: /tmp/dify_check.png')
} catch (e) {
  console.log('!! 异常:', String(e).slice(0, 300))
  await page.screenshot({ path: '/tmp/dify_check.png' }).catch(() => {})
} finally {
  await browser.close()
}
