/**
 * 批量设置 10.28.1.155 OJ 每道题的 difficulty（当前全部为 0 未评级）
 *
 * ⚠️ Hydro edit 接口有一堆坑（登录会话 / Accept 头 / form-urlencoded / tag 逗号串 /
 *    pid 必带 / 302 不代表成功），完整踩坑文档见 scripts/oj_refine_difficulty.cjs 头部注释。
 *    已按 1-10 细化定级的脚本为 oj_refine_difficulty.cjs，本脚本是早期的粗粒度版本。
 *
 * 定级规则（按英文标签，第一条命中即用，难度 1-10）：
 *   6  Knapsack / Linear DP
 *   5  Greedy / Binary Search / Prefix Sums and Difference Arrays
 *   4  Algorithms / Search / Recursion / Recurrence and Recursion
 *   3  Simulation / Sorting / Sequences
 *   2  其余（Strings / Lists / Math / 几何 / 字典集合栈队列等数据结构题）
 *   1  入门语法：Input and Output / Conditionals / Loops / 逻辑运算 / 输入输出格式类
 *
 * 用法：node scripts/oj_set_difficulty.cjs <username> <password>
 */
const fs = require('fs')
const path = require('path')

const BASE = 'http://10.28.1.155'
const OUT_DIR = path.join(__dirname, '..', 'storage', 'oj_problems')
const BACKUP = path.join(OUT_DIR, 'oj155_difficulty_backup.json')

const RULES = [
  { tags: ['Beginner', 'Input and Output', 'Conditionals', 'Loops', 'If', 'If-Else', 'Multi-way Branch', 'Three-way Branch', 'Nested Conditionals', 'Logical Operators', 'while', 'for', 'and', 'or', 'not', 'All in One Line', 'One per Line'], d: 1 },
  { tags: ['Strings', 'Lists', '2D Lists', 'Tuples', 'Dictionaries', 'Sets', 'Stacks', 'Queues', 'Functions'], d: 2 },
  { tags: ['Math', 'Geometry', 'Sequences', 'Simulation', 'Sorting'], d: 3 },
  { tags: ['Algorithms'], d: 4 },
  { tags: ['Search', 'Recursion', 'Recurrence and Recursion'], d: 5 },
  { tags: ['Greedy', 'Binary Search', 'Prefix Sums and Difference Arrays'], d: 6 },
  { tags: ['Knapsack', 'Linear DP'], d: 7 },
]
const computeDifficulty = (tags) => {
  for (const r of RULES) if (tags.some((t) => r.tags.includes(t))) return r.d
  return 2 // 其余（Strings/Lists/Math/Geometry/字典集合栈队列等数据结构题）
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

;(async () => {
  const [uname, password] = process.argv.slice(2)
  if (!uname || !password) {
    console.error('用法: node scripts/oj_set_difficulty.cjs <username> <password>')
    process.exit(1)
  }

  // 1. 登录
  await api('/login', 'POST', null, { uname, password })
  if (!COOKIE) throw new Error('登录失败：未拿到会话 cookie')
  console.log('登录 OK')

  // 2. 抓全部题目，确定每题目标难度
  const problems = []
  for (let page = 1; page <= 3; page++) {
    const { json } = await api(`/p?page=${page}`)
    problems.push(...json.pdocs.map((d) => ({ pid: d.pid, difficulty: d.difficulty, tag: d.tag || [] })))
  }
  const todo = problems
    .filter((p) => p.pid !== 'P0') // P0 保留原样
    .map((p) => ({ ...p, target: computeDifficulty(p.tag) }))
    .filter((p) => p.difficulty !== p.target)
  const dist = {}
  todo.forEach((p) => { dist[p.target] = (dist[p.target] || 0) + 1 })
  console.log(`待更新: ${todo.length} 道，目标分布: ${JSON.stringify(dist)}`)

  // 3. 备份当前关键字段
  const backup = {}
  for (const p of todo) {
    const { json } = await api(`/p/${p.pid}`)
    const d = json.pdoc
    backup[p.pid] = { title: d.title, content: d.content, tag: d.tag, difficulty: d.difficulty }
  }
  fs.mkdirSync(OUT_DIR, { recursive: true })
  fs.writeFileSync(BACKUP, JSON.stringify(backup, null, 2))
  console.log(`已备份: ${BACKUP}`)

  // 4. 试改第一题并验证
  const first = todo[0]
  const b = backup[first.pid]
  await api(`/p/${first.pid}/edit`, 'POST', null, { pid: first.pid, title: b.title, content: b.content, tag: b.tag.join(','), difficulty: String(first.target) })
  const check = await api(`/p/${first.pid}`)
  const dOk = check.json.pdoc.difficulty === first.target
  const intact = check.json.pdoc.content === b.content && check.json.pdoc.title === b.title && check.json.pdoc.pid === first.pid && JSON.stringify(check.json.pdoc.tag) === JSON.stringify(b.tag)
  if (!dOk || !intact) throw new Error(`试改失败：difficulty=${dOk}，其余字段完好=${intact}。终止。`)
  console.log(`试改成功: ${first.pid} → difficulty ${first.target}`)

  // 5. 批量执行
  let ok = 0
  const failed = []
  for (const p of todo) {
    const bb = backup[p.pid]
    try {
      await api(`/p/${p.pid}/edit`, 'POST', null, { pid: p.pid, title: bb.title, content: bb.content, tag: bb.tag.join(','), difficulty: String(p.target) })
      const v = await api(`/p/${p.pid}`)
      const d = v.json.pdoc
      if (d.difficulty === p.target && d.content === bb.content && d.title === bb.title && d.pid === p.pid && JSON.stringify(d.tag) === JSON.stringify(bb.tag)) ok++
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
