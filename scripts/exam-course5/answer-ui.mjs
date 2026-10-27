import { readFileSync } from 'node:fs'
import { chromium } from 'playwright-core'

const exam = JSON.parse(readFileSync(new URL('./exam.json', import.meta.url), 'utf8'))
const qs = exam.survey.children.filter((c) => ['Radio', 'Checkbox', 'FillBlank'].includes(c.type))

const b = await chromium.launch({ channel: 'chrome', headless: true })
const p = await b.newPage({ viewport: { width: 1280, height: 900 } })
const errs = []
p.on('pageerror', (e) => errs.push('pageerror: ' + e.message))
await p.goto('http://10.28.1.157/s/VFIXcX', { waitUntil: 'networkidle' })
await p.waitForTimeout(2000)

// 按正确答应答题：单选/多选点击对应索引的 input，填空按顺序填
const plan = { radios: [], checks: [], fills: [] }
let rIdx = 0, cIdx = 0
for (const q of qs) {
  if (q.type === 'FillBlank') {
    plan.fills.push(q.children[0].attribute.examCorrectAnswer)
    continue
  }
  const correct = new Set(q.children.map((o, i) => (o.attribute?.examCorrectAnswer != null ? i : -1)).filter((i) => i >= 0))
  if (q.type === 'Radio') {
    plan.radios.push(rIdx + [...correct][0])
    rIdx += q.children.length
  } else {
    for (const i of correct) plan.checks.push(cIdx + i)
    cIdx += q.children.length
  }
}

const clicked = await p.evaluate((plan) => {
  const radios = [...document.querySelectorAll('input[type=radio]')]
  const checks = [...document.querySelectorAll('input[type=checkbox]')]
  const inputs = [...document.querySelectorAll('input.ant-input')]
  plan.radios.forEach((i) => radios[i]?.click())
  plan.checks.forEach((i) => checks[i]?.click())
  inputs.forEach((el, i) => {
    if (plan.fills[i] == null) return
    const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set
    setter.call(el, plan.fills[i])
    el.dispatchEvent(new Event('input', { bubbles: true }))
  })
  return { radios: radios.length, checks: checks.length, inputs: inputs.length, clickedR: plan.radios.length, clickedC: plan.checks.length, filled: plan.fills.length }
}, plan)
console.log('页面元素/已作答:', JSON.stringify(clicked))
await p.waitForTimeout(800)

// 找提交按钮
const btnTexts = await p.evaluate(() => [...document.querySelectorAll('button')].map((b) => b.innerText.trim()).filter(Boolean).slice(-8))
console.log('页面按钮:', JSON.stringify(btnTexts))

const submit = p.locator('button', { hasText: /提交|Submit/i }).last()
await submit.click().catch((e) => errs.push('submit click: ' + e.message.slice(0, 100)))
await p.waitForTimeout(4000)

const body = (await p.innerText('body')).replace(/\s+/g, ' ')
console.log('\n--- 提交后页面 ---')
console.log(body.slice(0, 700))
console.log('\n--- 错误 ---')
errs.length ? errs.slice(0, 5).forEach((e) => console.log('  -', e)) : console.log('  无 ✓')
await p.screenshot({ path: '/tmp/exam-submitted.png', fullPage: false })
console.log('截图: /tmp/exam-submitted.png')
await b.close()
