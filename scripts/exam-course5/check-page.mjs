/**
 * 用无头 Chrome 打开试卷页面，捕获前端异常并截图
 *
 * 为什么需要：SurveyKing 是纯前端渲染（umi + antd），HTTP 200 说明不了问题。
 * 试卷少字段（比如没有 setting）时接口照样 200，但前端会崩成
 * "Something went wrong. Cannot read properties of undefined (reading 'status')"。
 *
 * 用法：
 *   node scripts/exam-course5/check-page.mjs --id VFIXcX           # 填写页（学生视角，不登录）
 *   node scripts/exam-course5/check-page.mjs --id VFIXcX --admin    # 编辑页（走 LMS SSO 登录）
 */
import { chromium } from 'playwright-core'
import { createClient, SK } from '../surveyking-oauth/sk-client.mjs'

const argv = process.argv.slice(2)
const opt = (n, d) => {
  const i = argv.indexOf(n)
  return i >= 0 ? argv[i + 1] : d
}
const projectId = opt('--id', '')
const asAdmin = argv.includes('--admin')
if (!projectId) {
  console.error('用法: node scripts/exam-course5/check-page.mjs --id <projectId> [--admin]')
  process.exit(1)
}

const url = asAdmin ? `${SK}/project/${projectId}` : `${SK}/s/${projectId}`

let cookies = []
let client = null
if (asAdmin) {
  client = await createClient()
  cookies = client.cookies
}

const browser = await chromium.launch({ channel: 'chrome', headless: true })
try {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } })
  if (cookies.length) await ctx.addCookies(cookies)
  const page = await ctx.newPage()

  const errors = []
  page.on('pageerror', (e) => errors.push('pageerror: ' + e.message))
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push('console: ' + m.text().slice(0, 200))
  })

  await page.goto(url, { waitUntil: 'networkidle', timeout: 40000 }).catch((e) => errors.push('goto: ' + e.message))
  await page.waitForTimeout(3000)

  const body = (await page.innerText('body').catch(() => '')).replace(/\n{2,}/g, '\n').trim()
  console.log(`URL: ${url}`)
  console.log('--- 页面文本（前 500 字）---')
  console.log(body.slice(0, 500))
  console.log('--- 前端错误 ---')
  if (errors.length === 0) console.log('  无 ✓')
  else errors.slice(0, 8).forEach((e) => console.log('  -', e))

  const crashed = /Something went wrong|Cannot read propert/i.test(body) || errors.some((e) => /Cannot read propert/i.test(e))
  const shot = `/tmp/exam-${projectId}-${asAdmin ? 'admin' : 'fill'}.png`
  await page.screenshot({ path: shot, fullPage: false })
  console.log('截图:', shot)
  console.log(crashed ? '\n❌ 页面崩溃' : '\n✅ 页面正常渲染')
  if (crashed) process.exitCode = 1
} finally {
  await browser.close()
  if (client) await client.close()
}
