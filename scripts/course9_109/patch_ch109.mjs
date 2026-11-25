#!/usr/bin/env node
/**
 * course 9 / chapter 109 (break Statement) —— 把所有例子改成 while 版本
 *
 * 用法：
 *   node scripts/course9_109/patch_ch109.mjs              # dry-run，打印改动
 *   node scripts/course9_109/patch_ch109.mjs --apply      # 上传章节 + 题目
 *
 * 说明：
 *   - 只做「定向替换」，每处替换都要求原文精确命中，找不到就报错退出（幂等且不会误伤新增内容）
 *   - 目标：所有代码示例只出现 while，不再出现 for
 */

import { readFileSync, writeFileSync } from 'node:fs'
import postgres from 'postgres'

const APPLY = process.argv.includes('--apply')

// ---------- 连接生产库 ----------
const env = readFileSync(new URL('../../.env', import.meta.url), 'utf8')
const prodLine = env
  .split('\n')
  .map((l) => l.replace(/^#\s*/, '').trim())
  .find((l) => l.startsWith('POSTGRES_URL=') && l.includes('10.28.1.151'))
if (!prodLine) throw new Error('.env 里找不到指向 10.28.1.151 的 POSTGRES_URL')
const PROD_URL = prodLine.replace(/^POSTGRES_URL=/, '')
const BASE = 'http://10.28.1.151'

const sql = postgres(PROD_URL, { max: 1, idle_timeout: 5 })

// ---------- tiptap 小工具 ----------
const p = (t) => ({ type: 'text', text: t })
const c = (t) => ({ type: 'text', text: t, marks: [{ type: 'code' }] })
const plain = (node) =>
  (node.content || [])
    .map((n) => (n.type === 'text' ? n.text : plain(n)))
    .join('')

// ---------- 富文本段落改写表（按 plainText 精确匹配） ----------
const RICH = [
  {
    from: '🧩 Use break in for and while loops.',
    to: [p('🧩 Use '), c('break'), p(' inside a '), c('while'), p(' loop.')],
    why: 'Learning Objectives 第 3 条',
  },
  {
    from: '🧩 Use break with for and while.',
    to: [p('🧩 Use '), c('break'), p(' inside a '), c('while'), p(' loop.')],
    why: 'Summary 第 3 条',
  },
  {
    from: 'When i becomes 5, the loop stops.',
    to: [p('When '), c('count'), p(' becomes '), c('5'), p(', the loop stops.')],
    why: 'Basic Syntax 输出解释',
  },
  {
    from: '🧪 Using break in a for Loop',
    to: [p('🧪 Using '), c('break'), p(' in a '), c('while'), p(' Loop')],
    why: '第 2 节标题 for -> while',
  },
  {
    from: '🧪 Using break in a while Loop',
    to: [p('🧪 Using '), c('break'), p(' with a '), c('Counter')],
    why: '第 3 节标题（避免与第 2 节重名）',
  },
]

// ---------- 代码块改写表 ----------
const CODE = [
  {
    from: 'for i in range(10):\n    if i == 5:\n        break\n\n    print(i)',
    to: 'count = 0\n\nwhile count < 10:\n    if count == 5:\n        break\n\n    print(count)\n    count += 1',
    why: 'Basic Syntax 示例（输出 0-4 不变）',
  },
  {
    from: 'numbers = [3, 7, 9, 12, 15]\n\nfor number in numbers:\n    if number == 12:\n        break\n\n    print(number)',
    to: 'numbers = [3, 7, 9, 12, 15]\nindex = 0\n\nwhile index < len(numbers):\n    number = numbers[index]\n\n    if number == 12:\n        break\n\n    print(number)\n    index += 1',
    why: '第 2 节示例 for -> while（输出 3 7 9 不变）',
  },
  {
    from: 'names = ["Alice", "Bob", "Tom", "Emma"]\n\nfor name in names:\n    if name == "Tom":\n        print("Found!")\n        break',
    to: 'names = ["Alice", "Bob", "Tom", "Emma"]\nindex = 0\n\nwhile index < len(names):\n    if names[index] == "Tom":\n        print("Found!")\n        break\n\n    index += 1',
    why: '搜索示例 for -> while（输出 Found! 不变）',
  },
  {
    from: 'for i in range(3):\n    for j in range(5):\n        if j == 2:\n            break\n\n        print(i, j)',
    to: 'i = 0\nwhile i < 3:\n    j = 0\n\n    while j < 5:\n        if j == 2:\n            break\n\n        print(i, j)\n        j += 1\n\n    i += 1',
    why: '嵌套循环 for -> while（输出 0 0 ... 2 1 不变）',
  },
]

// ---------- 递归改写 ----------
const hits = new Map() // why -> count

function bump(why) {
  hits.set(why, (hits.get(why) || 0) + 1)
}

function walk(node) {
  if (Array.isArray(node)) return node.map(walk)
  if (!node || typeof node !== 'object') return node
  const out = { ...node }

  // 富文本容器
  if (Array.isArray(node.content) && node.content.some((n) => n.type === 'text')) {
    const txt = plain(node)
    const hit = RICH.find((r) => r.from === txt)
    if (hit) {
      out.content = hit.to.map((n) => ({ ...n }))
      bump(hit.why)
      return out
    }
  }

  // 代码块
  if (node.type === 'codeBlock') {
    const txt = plain(node)
    const hit = CODE.find((r) => r.from === txt)
    if (hit) {
      out.content = [{ type: 'text', text: hit.to }]
      bump(hit.why)
      return out
    }
  }

  if (Array.isArray(node.content)) out.content = node.content.map(walk)
  return out
}

// ---------- tiptap 合法性校验 ----------
function validate(node, path = 'doc', errors = []) {
  if (Array.isArray(node)) {
    node.forEach((n, i) => validate(n, `${path}[${i}]`, errors))
    return errors
  }
  if (!node || typeof node !== 'object') return errors
  if (!node.type) errors.push(`${path}: 缺少 type`)
  if (node.type === 'text') {
    if (typeof node.text !== 'string') errors.push(`${path}: text 非字符串`)
    else if (node.text === '') errors.push(`${path}: text 为空字符串（会让整篇 schema 校验失败）`)
    if (node.marks) {
      node.marks.forEach((m, i) => {
        if (!m.type) errors.push(`${path}.marks[${i}]: 缺少 type`)
        if (Object.keys(m).some((k) => m[k] === undefined)) errors.push(`${path}.marks[${i}]: 含 undefined`)
      })
    }
  }
  if (node.type === 'codeBlock') {
    for (const k of ['theme', 'language']) {
      if (node.attrs?.[k] === undefined) errors.push(`${path}: codeBlock 缺少 attrs.${k}`)
    }
  }
  if (node.attrs && Object.keys(node.attrs).some((k) => node.attrs[k] === undefined)) {
    errors.push(`${path}: attrs 含 undefined 键`)
  }
  if (Array.isArray(node.content)) validate(node.content, `${path}.content`, errors)
  return errors
}

// ---------- 题目定义 ----------
const QUESTIONS = {
  142: {
    name: 'What Is the break Statement?',
    content:
      'True or False: Inside a `while` loop, the `break` statement ends the loop immediately and the program continues on the first line after the loop.',
    explanation:
      'When Python meets break inside a while loop, the loop stops right away — the loop condition is not checked again.',
  },
  143: {
    name: 'Basic Syntax',
    content:
      'What is the output of the following code?\n\n```python\ncount = 0\n\nwhile count < 8:\n    if count == 4:\n        break\n    print(count)\n    count += 1\n```',
    options: ['0\n1\n2\n3\n4', '0\n1\n2\n3', '1\n2\n3\n4', '0\n1\n2\n3\n4\n5\n6\n7'],
    answer: [1],
    explanation: 'count goes 0, 1, 2, 3; when it becomes 4 the break runs, so 4 is never printed.',
  },
  144: {
    name: 'Using break in a while Loop',
    content:
      'What is the output of the following code?\n\n```python\nnumbers = [4, 6, 8, 10, 12]\nindex = 0\n\nwhile index < len(numbers):\n    if numbers[index] == 10:\n        break\n    print(numbers[index])\n    index += 1\n```',
    options: ['4\n6\n8\n10', '4\n6\n8', '4\n6\n8\n10\n12', '4\n6\n8\n12'],
    answer: [1],
    explanation: 'The while loop walks the list by index and stops at 10, so only 4, 6, 8 are printed.',
    tags: ['break', 'while'],
  },
  145: {
    name: 'Using break with a Counter',
    content:
      'What is the output of the following code?\n\n```python\ncount = 1\n\nwhile count <= 8:\n    print(count)\n    if count == 4:\n        break\n    count += 1\n```',
    options: ['1\n2\n3', '1\n2\n3\n4\n5\n6\n7\n8', '1\n2\n3\n4', '4\n3\n2\n1'],
    answer: [2],
    explanation: 'The counter prints 1, 2, 3, 4; then the break leaves the while loop.',
    tags: ['break', 'while'],
  },
  146: {
    name: 'Example: Searching for an Item',
    content:
      'True or False: The code below prints `Found!` and stops as soon as it finds `Cara` in the list.\n\n```python\nnames = ["Amy", "Ben", "Cara", "Dan"]\nindex = 0\n\nwhile index < len(names):\n    if names[index] == "Cara":\n        print("Found!")\n        break\n    index += 1\n```',
    explanation: 'When names[index] == "Cara", the code prints Found! and break leaves the while loop at once.',
  },
  147: {
    name: 'break in Nested Loops',
    content: 'In nested `while` loops, which of the following statements about `break` are correct? (Select all that apply)',
    options: [
      'break only exits the current (innermost) while loop',
      'The outer while loop continues after the inner loop breaks',
      'break stops the entire program and halts everything',
      'break works the same way in a while loop as in any other loop',
    ],
    answer: [0, 1, 3],
    explanation:
      'break only exits the current (innermost) loop, so the outer while loop keeps running. It does NOT stop the whole program.',
    tags: ['break', 'nested loop', 'while'],
  },
  149: {
    name: 'Using break Outside a Loop',
    content:
      'True or False: `break` can only be used inside a loop — writing it outside a loop (for example, directly under an `if`) is a SyntaxError.',
    explanation: 'break must sit inside a loop body. Outside a loop Python raises: SyntaxError: break outside loop.',
  },
  427: {
    name: 'Forgetting the Condition',
    content:
      'True or False: `while True:` with a `break` works, but it is better to give the `while` a clear condition (e.g. `while command != "quit":`).',
    explanation: 'break inside while True works, but a clear loop condition is easier to read and safer.',
  },
}

// ---------- 登录 ----------
async function login() {
  // 优先用外部传入的临时 token（admin 密码已改过，直接插 tokens 更省事）
  const arg = process.argv.find((a) => a.startsWith('--token='))
  if (arg) {
    console.log('🔑 使用传入的临时 token')
    return `auth_token=${arg.slice('--token='.length)}`
  }
  const res = await fetch(`${BASE}/api/auth/login`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ username: 'admin', password: process.env.LMS_PASS }),
  })
  const setCookie = res.headers.getSetCookie?.() || []
  const cookie = setCookie.map((s) => s.split(';')[0]).join('; ')
  const body = await res.json().catch(() => ({}))
  if (!cookie) throw new Error('登录失败：没有拿到 cookie —— ' + JSON.stringify(body))
  console.log('🔑 登录成功')
  return cookie
}

// ---------- main ----------
const [chapter] = await sql`select content from chapters where id = 109`
if (!chapter) throw new Error('找不到 chapter 109')
const before = chapter.content

writeFileSync(new URL('./backup-109.json', import.meta.url), JSON.stringify(before, null, 2))
console.log('💾 备份 -> scripts/course9_109/backup-109.json')

const after = walk(before)

// 校验
const errs = validate(after)
if (errs.length) {
  console.error('❌ tiptap 校验失败：')
  errs.forEach((e) => console.error('  -', e))
  process.exit(1)
}
if (after.attrs) {
  console.error('❌ doc 根节点带了 attrs')
  process.exit(1)
}

// 确认所有代码块都不再有 for
const leftover = []
;(function scan(n) {
  if (Array.isArray(n)) return n.forEach(scan)
  if (!n || typeof n !== 'object') return
  if (n.type === 'codeBlock') {
    const t = plain(n)
    if (/\bfor\b/.test(t)) leftover.push(t.slice(0, 60))
  }
  if (Array.isArray(n.content)) n.content.forEach(scan)
})(after)
if (leftover.length) {
  console.error('❌ 仍有 for 代码块：', leftover)
  process.exit(1)
}

console.log('\n=== 教程改动 ===')
for (const r of RICH) console.log(` ${hits.get(r.why) ? '✅' : '❌'} ${r.why}`)
for (const r of CODE) console.log(` ${hits.get(r.why) ? '✅' : '❌'} ${r.why}`)
const missed = RICH.filter((r) => !hits.get(r.why)).length + CODE.filter((r) => !hits.get(r.why)).length
if (missed) {
  console.error(`\n❌ 有 ${missed} 处改写未命中，原文可能已被改动，先看一眼再说`)
  process.exit(1)
}

console.log('\n=== 代码块最终预览 ===')
;(function scan(n) {
  if (Array.isArray(n)) return n.forEach(scan)
  if (!n || typeof n !== 'object') return
  if (n.type === 'codeBlock' && plain(n).includes('while')) {
    console.log('---')
    console.log(plain(n))
  }
  if (Array.isArray(n.content)) n.content.forEach(scan)
})(after)

if (!APPLY) {
  console.log('\n(dry-run) 加 --apply 才会写库')
  await sql.end({ timeout: 3 })
  process.exit(0)
}

// ---------- 上传 ----------
const cookie = await login()

const chRes = await fetch(`${BASE}/api/chapters/update`, {
  method: 'POST',
  headers: { 'content-type': 'application/json', cookie },
  body: JSON.stringify({ id: 109, content: after }),
})
const chJson = await chRes.json()
console.log('\n📤 章节：', chRes.status, JSON.stringify(chJson).slice(0, 200))

for (const [cid, q] of Object.entries(QUESTIONS)) {
  const payload = { course_id: 9, id: Number(cid), ...q }
  const r = await fetch(`${BASE}/api/questions/update`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', cookie },
    body: JSON.stringify(payload),
  })
  const j = await r.json().catch(() => ({}))
  console.log(`📝 题目 ${cid} "${q.name}" ->`, r.status, j?.success === false ? JSON.stringify(j) : 'ok')
}

await sql.end({ timeout: 3 })
console.log('\n✅ 完成')
