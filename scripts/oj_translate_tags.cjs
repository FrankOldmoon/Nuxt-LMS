/**
 * 批量把 OJ（地址取系统设置 oj.url）题目标签改成英文
 *
 * 用法：node scripts/oj_translate_tags.cjs <username> <password>
 * 安全点（沿用标题翻译的教训）：edit 四字段全带（pid + 当前 title + 当前 content + 新 tag），
 * tag 为逗号拼接字符串；改前备份；逐题回读验证 title/content/pid 不变。
 * ⚠️ Hydro edit 接口踩坑大全见 scripts/oj_refine_difficulty.cjs 头部注释
 *    （登录会话 / Accept 头 / form-urlencoded / tag 逗号串 / pid 必带 / 302 需回读验证）。
 */
const fs = require('fs')
const path = require('path')
const { getOjBase } = require('./lib/oj-config.cjs')

// OJ 平台基址来自系统设置（configs 表 lms:oj.url），不硬编码；启动时解析
let BASE = ''
const OUT_DIR = path.join(__dirname, '..', 'storage', 'oj_problems')
const BACKUP = path.join(OUT_DIR, 'oj155_tag_backup.json')

/* ---------- 标签映射（中 → 英） ---------- */
const TAG_MAP = {
  算法: 'Algorithms',
  入门: 'Beginner',
  字符串: 'Strings',
  模拟: 'Simulation',
  数学: 'Math',
  递推递归: 'Recurrence and Recursion',
  贪心: 'Greedy',
  背包: 'Knapsack',
  线性DP: 'Linear DP',
  搜索: 'Search',
  排序: 'Sorting',
  循环结构: 'Loops',
  前缀和与差分: 'Prefix Sums and Difference Arrays',
  列表: 'Lists',
  分支结构: 'Conditionals',
  函数: 'Functions',
  二维列表: '2D Lists',
  二分查找: 'Binary Search',
  递归: 'Recursion',
  一行全部: 'All in One Line',
  一行一个: 'One per Line',
  逻辑运算: 'Logical Operators',
  输入输出: 'Input and Output',
  四则运算: 'Arithmetic Operations',
  几何: 'Geometry',
  集合: 'Sets',
  队列: 'Queues',
  栈: 'Stacks',
  字典: 'Dictionaries',
  双分支: 'If-Else',
  单分支: 'If',
  元组: 'Tuples',
  数列: 'Sequences',
  嵌套分支: 'Nested Conditionals',
  多分支: 'Multi-way Branch',
  三分支: 'Three-way Branch',
  // 已是英文的标签直接保留
  while: 'while',
  for: 'for',
  and: 'and',
  or: 'or',
  not: 'not',
}

let COOKIE = ''
async function api(p, method = 'GET', body, form) {
  // ⚠️ POST 不能带 Accept: application/json（edit 路由 JSON 响应器会 500 且不落库），
  // 完整踩坑文档见 scripts/oj_refine_difficulty.cjs 头部注释
  const headers = method === 'GET' ? { Accept: 'application/json' } : {}
  if (COOKIE) headers.Cookie = COOKIE
  if (body) headers['Content-Type'] = 'application/json'
  const res = await fetch(BASE + p, {
    method,
    headers,
    redirect: 'manual',
    body: body ? JSON.stringify(body) : form ? new URLSearchParams(form) : undefined,
  })
  const setCookie = res.headers.getSetCookie ? res.headers.getSetCookie() : []
  if (setCookie.length) COOKIE = setCookie.map((c) => c.split(';')[0]).join('; ')
  const text = await res.text()
  try { return { status: res.status, json: JSON.parse(text) } } catch { return { status: res.status, text } }
}

const translateTag = (t) => {
  if (TAG_MAP[t]) return TAG_MAP[t]
  if (!/[^\x00-\x7F]/.test(t)) return t // 纯 ASCII 原样保留
  throw new Error(`未映射的标签: ${t}`)
}

;(async () => {
  BASE = await getOjBase()
  console.log(`OJ base: ${BASE}`)
  const [uname, password] = process.argv.slice(2)
  if (!uname || !password) {
    console.error('用法: node scripts/oj_translate_tags.cjs <username> <password>')
    process.exit(1)
  }

  // 1. 登录
  await api('/login', 'POST', null, { uname, password })
  if (!COOKIE) throw new Error('登录失败：未拿到会话 cookie')
  console.log('登录 OK')

  // 2. 抓全部题目
  const problems = []
  for (let page = 1; page <= 3; page++) {
    const { json } = await api(`/p?page=${page}`)
    problems.push(...json.pdocs.map((d) => ({ pid: d.pid, title: d.title, tag: d.tag || [] })))
  }
  console.log(`共 ${problems.length} 道题`)

  // 3. 需要改的题（含非 ASCII 标签）
  const todo = problems.filter((p) => p.tag.some((t) => /[^\x00-\x7F]/.test(t)))
  console.log(`含中文标签的题: ${todo.length} 道`)

  // 4. 备份当前完整 pdoc 关键字段
  const backup = {}
  for (const p of todo) {
    const { json } = await api(`/p/${p.pid}`)
    const d = json.pdoc
    backup[p.pid] = { title: d.title, content: d.content, tag: d.tag }
  }
  fs.mkdirSync(OUT_DIR, { recursive: true })
  fs.writeFileSync(BACKUP, JSON.stringify(backup, null, 2))
  console.log(`已备份: ${BACKUP}（${Object.keys(backup).length} 题）`)

  // 5. 试改第一题并验证
  const first = todo[0]
  const b = backup[first.pid]
  const newTags = b.tag.map(translateTag)
  await api(`/p/${first.pid}/edit`, 'POST', null, { pid: first.pid, title: b.title, content: b.content, tag: newTags.join(',') })
  const check = await api(`/p/${first.pid}`)
  const tagsOk = JSON.stringify(check.json.pdoc.tag) === JSON.stringify(newTags)
  const intact = check.json.pdoc.content === b.content && check.json.pdoc.title === b.title && check.json.pdoc.pid === first.pid
  if (!tagsOk || !intact) {
    throw new Error(`试改失败：tags 改动=${tagsOk}，title/content/pid 完好=${intact}。终止，未批量执行。`)
  }
  console.log(`试改成功: ${first.pid} → [${newTags.join(', ')}]`)

  // 6. 批量执行
  let ok = 0
  const failed = []
  for (const p of todo) {
    const bb = backup[p.pid]
    try {
      const nt = bb.tag.map(translateTag)
      await api(`/p/${p.pid}/edit`, 'POST', null, { pid: p.pid, title: bb.title, content: bb.content, tag: nt.join(',') })
      const v = await api(`/p/${p.pid}`)
      const d = v.json.pdoc
      if (JSON.stringify(d.tag) === JSON.stringify(nt) && d.content === bb.content && d.title === bb.title && d.pid === p.pid) ok++
      else failed.push(p.pid)
    } catch (e) {
      failed.push(p.pid)
      console.error(`FAIL ${p.pid}: ${e.message}`)
    }
  }
  console.log(`\n完成: ${ok}/${todo.length} 成功${failed.length ? '，失败: ' + failed.join(',') : ''}`)
})().catch((e) => {
  console.error('❌ 失败:', e.message)
  process.exit(1)
})
