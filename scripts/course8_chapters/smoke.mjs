/** Browser smoke test for course 8 chapters 198-201. */
import { chromium } from '/Users/oldmoon/Documents/ubuntu/nuxt_lms_2026/node_modules/playwright-core/index.mjs'
import os from 'node:os'
import { mkdirSync } from 'node:fs'

const EXE = os.homedir() + '/Library/Caches/ms-playwright/chromium-1243/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing'
mkdirSync('/tmp/c8/shots', { recursive: true })

const b = await chromium.launch({ executablePath: EXE })
const ctx = await b.newContext({ viewport: { width: 1440, height: 1000 } })
const p = await ctx.newPage()
const errs = []
p.on('pageerror', e => errs.push(e.message.slice(0, 140)))

await p.goto('http://10.28.1.151/', { waitUntil: 'domcontentloaded' })
await p.evaluate(() => fetch('/api/auth/login', {
  method: 'POST', headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ username: 'admin', password: process.env.LMS_PASS }),
}))

for (const id of [198, 199, 200, 201]) {
  errs.length = 0
  await p.goto(`http://10.28.1.151/course/8/${id}`, { waitUntil: 'networkidle', timeout: 60000 })
  await p.waitForTimeout(6000)

  const info = await p.evaluate(() => {
    const q = (sel) => document.querySelectorAll(sel).length
    return {
      h2: [...document.querySelectorAll('h2')].map(h => h.textContent.trim().slice(0, 52)),
      h3: q('h3'),
      tables: q('table'),
      iframes: [...document.querySelectorAll('iframe')].map(f => (f.src || '').slice(0, 46)),
      pre: q('pre'),
      images: q('img[src*="files/serve"]'),
      toc: q('[class*="toc"] a'),
      text: document.body.innerText.length,
      // entity widgets that resolved
      homework: q('[class*="homework"]'),
      question: q('[class*="question"]'),
    }
  })

  console.log(`\n[${id}] ${info.h2[1] || ''}`)
  info.h2.forEach(h => console.log('   ' + h))
  console.log(`   h3=${info.h3} tables=${info.tables} pre=${info.pre} images=${info.images} tocLinks=${info.toc} textLen=${info.text}`)
  console.log(`   iframes: ${info.iframes.join(' | ') || '(none)'}`)
  if (errs.length) console.log('   ⚠ errors:', errs.slice(0, 3))
  await p.screenshot({ path: `/tmp/c8/shots/ch${id}.png` })
}
await b.close()
