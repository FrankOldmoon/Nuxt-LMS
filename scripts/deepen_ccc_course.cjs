/**
 * CCC 课程深化：每章知识点加深 + 全部 155 题按知识点分类、以 OJ 题型嵌入对应章节
 *
 * 结构变化：11 个顶级章节（合并 Loops→Conditionals and Loops、String Processing→Strings、
 *          Timeline Simulation→Enumeration and Simulation、删除 Direct Calculation——J1 归 IO、J2 归条件循环）
 * 题目：清空 course 7 全部旧题 → 重建 16 道快速检测题 + 155 道 OJ 题（checkpoint 幂等）
 *
 * 用法：node scripts/deepen_ccc_course.cjs
 */
const fs = require('fs')
const path = require('path')
const { getOjBase } = require('./lib/oj-config.cjs')

const BASE = 'https://aics.oldmoon.cn'
// OJ 平台基址取自 BASE 所在站点的系统设置（oj.url），不硬编码；启动时解析
let OJ_BASE = ''
const COURSE_ID = 7
const OUT_DIR = path.join(__dirname, '..', 'storage', 'oj_problems')
const CHECKPOINT = path.join(OUT_DIR, 'qcids.json')
const MD_FILE = path.join(__dirname, 'ccc_tutorial_deep.md')

/* ---------- 知识点 → 题目分类（必须恰好覆盖 details.json 全部 155 题） ---------- */
const CHAPTER_PROBLEMS = {
  C_IO: ['CCC10J1','CCC11J1','CCC12J1','CCC13J1','CCC14J1','CCC15J1','CCC16J1','CCC17J1','CCC18J1','CCC19J1','CCC20J1','CCC21J1','CCC22J1','CCC23J1','CCC24J1','CCC25J1','CCC26J1'],
  C_CL: ['CCC10J2','CCC10J3','CCC11J2','CCC11J3','CCC12J2','CCC12J3','CCC14J3','CCC17J2','CCC18J3','CCC20J2','CCC22J2','CCC23J2','CCC24J2','CCC25J2','CCC26J2'],
  C_STR: ['CCC12J4','CCC13J2','CCC14J2','CCC15J2','CCC15J3','CCC16J3','CCC19J2','CCC19J3','CCC20J4','CCC21J3','CCC22J3','CCC24J4','CCC25J3'],
  C_LIST: ['CCC14J5','CCC17J5','CCC18J4','CCC20J3','CCC21J2','CCC23J3','CCC24J3'],
  C_ENUM: ['CCC10J4','CCC11J4','CCC13J3','CCC13J4','CCC14J4','CCC15J4','CCC16J4','CCC17J3','CCC17J4','CCC22J4','CCC25J4','CCC26J3','CCC26J5'],
  C_GRID: ['CCC16J2','CCC18J2','CCC19J4','CCC21J5','CCC22J5','CCC23J4','CCC25J5','CCC26J4'],
  C_SEARCH: ['CCC10J5','CCC18J5','CCC20J5','CCC23J5','CCC24J5'],
  C_REC: ['CCC11J5','CCC12J5','CCC13J5','CCC15J5','CCC19J5'],
  C_SENIOR: ['ALL_S', 'CCC16J5', 'CCC21J4'],
}

/* ---------- 章节定义 ---------- */
const CHAPTERS = [
  { key: 'C_ABOUT', id: 14, name: 'About the CCC', quick: ['Q1', 'Q2'] },
  { key: 'C_IO', id: 569, name: 'Input and Output', quick: ['Q3', 'Q4'] },
  { key: 'C_CL', id: 570, name: 'Conditionals and Loops', quick: ['Q5', 'Q6'] },
  { key: 'C_STR', id: 572, name: 'Strings', quick: ['Q7', 'Q10'] },
  { key: 'C_LIST', id: 573, name: 'Lists and Sorting', quick: ['Q8', 'Q13'] },
  { key: 'C_ENUM', id: 577, name: 'Enumeration and Simulation', quick: ['Q11', 'Q12'] },
  { key: 'C_GRID', id: 579, name: '2D Grids', quick: ['Q19'] },
  { key: 'C_SEARCH', id: 580, name: 'Search (BFS / DFS)', quick: ['Q14', 'Q15', 'Q16'] },
  { key: 'C_REC', id: 581, name: 'Recursion and Backtracking', quick: ['Q17'] },
  { key: 'C_SENIOR', id: 583, name: 'The Senior Route', quick: ['Q18'] },
  { key: 'C_PLAN', id: 586, name: 'Real Problems & Training Plan', quick: [] },
]
const DELETE_CHAPTERS = [571, 575, 576, 578] // Loops / Direct Calculation / String Processing / Timeline Simulation

let TOKEN = ''
async function api(p, method = 'GET', body) {
  const res = await fetch(BASE + p, {
    method,
    headers: { 'Content-Type': 'application/json', Cookie: `auth_token=${TOKEN}` },
    body: body === undefined ? undefined : JSON.stringify(body),
  })
  const data = await res.json()
  if (!data.success) throw new Error(`${method} ${p}: ${data.msg || res.status}`)
  return data.data
}

/* ---------- tiptap 工具 ---------- */
const t = (text, marks) => ({ type: 'text', text, ...(marks ? { marks } : {}) })
const code = (text) => t(text, [{ type: 'code' }])
const p = (...children) => ({ type: 'paragraph', content: children.map((c) => (typeof c === 'string' ? t(c) : c)) })
const codeBlock = (language, ...lines) => ({ type: 'codeBlock', attrs: { language }, content: [t(lines.join('\n'))] })
const docOf = (...blocks) => ({ type: 'doc', content: blocks })
const inputNode = (ans) => ({ type: 'inputs', attrs: { content: ans } })
const selectNode = (ans) => ({ type: 'select', attrs: { content: ans } })

function validateContent(node, issues = []) {
  if (!node || typeof node !== 'object') return issues
  if (node.type === 'text') {
    if (typeof node.text !== 'string') issues.push('text.text is not a string')
    if (node.marks !== undefined && !Array.isArray(node.marks)) issues.push('marks is not an array')
  }
  if (node.type === 'heading' && !node.attrs?.id) issues.push('heading missing id')
  if (node.type === 'codeBlock' && !node.attrs?.language) issues.push('codeBlock missing language')
  if (Array.isArray(node.content)) node.content.forEach((n) => validateContent(n, issues))
  else if (node.content && typeof node.content === 'object') validateContent(node.content, issues)
  return issues
}

/* ---------- 快速检测题（英文，沿用已验证定义） ---------- */
const JUDGE = ['Correct', 'Wrong']
const QUICK = [
  { key: 'Q1', name: 'CCC Basics · Format', type: 'judge',
    content: docOf(p('The CCC is organized by the University of Waterloo. Junior and Senior are two different papers, and you choose one when you register.')),
    options: JUDGE, answer: [0] },
  { key: 'Q2', name: 'CCC Basics · Partial Credit', type: 'judge',
    content: docOf(p('Every problem is scored per test batch (subtask), so even a brute-force solution that handles only small cases earns points — never leave a problem unsubmitted.')),
    options: JUDGE, answer: [0] },
  { key: 'Q3', name: 'Syntax · input() Returns', type: 'fill',
    content: docOf(p('input() always returns a ', inputNode('string'), ', so you must call int() before doing any math with it.')),
    options: [''], answer: ['string'] },
  { key: 'Q4', name: 'Syntax · The input() Trap', type: 'single',
    content: docOf(p('Run the code below and type 3. What happens?'), codeBlock('python', 'x = input()', 'print(x + 1)')),
    options: ['It prints 4', 'It prints 31', 'It crashes: you cannot add a string and an integer', 'It prints x + 1'], answer: [2],
    explanation: docOf(p('input() returns the string "3", and "3" + 1 is a type error. Write x = int(input()) instead.')) },
  { key: 'Q5', name: 'Syntax · Conditionals', type: 'single',
    content: docOf(p('Run the speed-fine code (limit 40, speed 75). What does it print?')),
    options: ['100', '500', 'Congratulations, you are within the speed limit!', 'It crashes'], answer: [1],
    explanation: docOf(p('over = 75 - 40 = 35 > 30, so the else branch prints 500.')) },
  { key: 'Q6', name: 'Syntax · for Loops', type: 'select',
    content: docOf(p('You want to repeat a block of code 10 times. The best line is:', selectNode('for i in range(10):'))),
    options: ['for i in range(10):', 'while 10:', 'repeat(10):', 'for i until 10:'], answer: ['for i in range(10):'] },
  { key: 'Q7', name: 'Syntax · String Expressions', type: 'multiple',
    content: docOf(p('Which of these expressions equal 3?')),
    options: ['`len("abc")`', '`len("ab")`', '`len("a,b,c".split(","))`', '`"abc".upper()`'], answer: [0, 2],
    explanation: docOf(p('len("abc") = 3; "a,b,c".split(",") gives ["a","b","c"], length 3. The others are 2 and "ABC".')) },
  { key: 'Q8', name: 'Syntax · Sorting', type: 'fill',
    content: docOf(p('Given ', code('scores = [80, 95, 70]'), ', calling ', code('scores.'), inputNode('sort'), code('()'), ' sorts it in ascending order.')),
    options: [''], answer: ['sort'] },
  { key: 'Q10', name: 'Strings · Valid Snippets', type: 'multiple',
    content: docOf(p('Which of these Python snippets are valid?')),
    options: ['`len(s)` returns the length of s', '`s[::-1]` reverses s', '`s + 1` appends 1 to the string', "`'*' * 5` gives `'*****'`"],
    answer: [0, 1, 3], explanation: docOf(p('A string cannot be added to a number directly — use str() or an f-string.')) },
  { key: 'Q11', name: 'Enumeration · Mindset', type: 'judge',
    content: docOf(p('For From 1987 to 2013, trying year after year from Y+1 sounds "dumb", but when the search space is small it is a correct and reliable solution.')),
    options: JUDGE, answer: [0] },
  { key: 'Q12', name: 'Simulation · Dictionary Bookkeeping', type: 'judge',
    content: docOf(p('For Wait Time style timeline simulations, a dictionary recording each friend\'s "waiting start time" is a good fit; settle the wait when the S event arrives.')),
    options: JUDGE, answer: [0] },
  { key: 'Q13', name: 'Lists · Sunflowers Row Order', type: 'single',
    content: docOf(p('In CCC18J4 the kids may have shuffled the rows. How do you recover the correct order?')),
    options: ['Sort the rows by column 0 (day-1 height) ascending', 'Sort by the last row', 'Transpose the table', 'Subtract 1 from every number'], answer: [0] },
  { key: 'Q19', name: 'Grids · Grid Reading', type: 'single',
    content: docOf(p('What is the cleanest way to read a grid of R rows (one string per row)?')),
    options: ['`grid = [input() for _ in range(R)]`', '`grid = input(R)`', '`grid = [input()] * R`', '`read(R, grid)`'], answer: [0],
    explanation: docOf(p('The list comprehension calls input() exactly R times, building a list of R strings.')) },
  { key: 'Q14', name: 'Search · BFS Structure', type: 'select',
    content: docOf(p('The core data structure of BFS (breadth-first search) is a:', selectNode('Queue'))),
    options: ['Stack', 'Queue', 'Heap', 'Linked list'], answer: ['Queue'] },
  { key: 'Q15', name: 'Search · visited Set', type: 'fill',
    content: docOf(p('In the BFS template, the visited set prevents ', inputNode('revisiting'), ' the same cell.')),
    options: [''], answer: ['revisiting'] },
  { key: 'Q16', name: 'Search · Fewest Steps', type: 'single',
    content: docOf(p('Knight Hop asks for the fewest knight jumps between two squares. Which algorithm fits best?')),
    options: ['BFS (breadth-first search)', 'DFS (depth-first search)', 'Greedy', 'Quicksort'], answer: [0],
    explanation: docOf(p('BFS expands layer by layer, so the first time you reach the goal is with the fewest steps.')) },
  { key: 'Q17', name: 'Recursion · Base Case', type: 'judge',
    content: docOf(p('Every recursive function must have a base case (an exit), otherwise it recurses forever until the program crashes.')),
    options: JUDGE, answer: [0] },
  { key: 'Q18', name: 'Senior · Greedy Pairing', type: 'single',
    content: docOf(p('In Tandem Bicycle, when d=1 (maximize total speed), the right pairing strategy is:')),
    options: ['Sort one list ascending and the other descending, then pair them up', 'Sort both ascending and pair them up', 'Sort both descending and pair them up', 'Pair randomly'], answer: [0],
    explanation: docOf(p('Ascending paired with descending → every max() picks the larger rider, maximizing the total.')) },
]

/* ---------- 工具 ---------- */
function buildIndexTable() {
  const details = JSON.parse(fs.readFileSync(path.join(OUT_DIR, 'details.json'), 'utf8'))
  const byYear = {}
  for (const d of details) {
    const y = d.pid.match(/CCC(\d+)/)[1]
    const lvl = d.pid.includes('J') ? 'J' : 'S'
    byYear[y] = byYear[y] || { J: [], S: [] }
    byYear[y][lvl].push(d.pid)
  }
  const years = Object.keys(byYear).sort((a, b) => Number(a) - Number(b))
  const link = (pid) => `[${pid}](${OJ_BASE}/p/${pid})`
  let md = '| Year | 🥉 Junior J1–J5 | 🥇 Senior S1–S5 |\n| --- | --- | --- |\n'
  for (const y of years) {
    md += `| 20${y} | ${byYear[y].J.map(link).join(' ')} | ${byYear[y].S.map(link).join(' ')} |\n`
  }
  return md
}

function parseSections() {
  const raw = fs.readFileSync(MD_FILE, 'utf8')
  const sections = {}
  let cur = null
  for (const line of raw.split('\n')) {
    const m = line.match(/^%%%%%\s*(\S+)/)
    if (m) { cur = m[1]; sections[cur] = []; continue }
    if (cur) sections[cur].push(line)
  }
  for (const k of Object.keys(sections)) sections[k] = sections[k].join('\n').trim()
  return sections
}

async function fillChapter(id, name, md, qmap, expectedMarkers) {
  await api('/api/chapters/update', 'POST', { id, name, content: md })
  if (!expectedMarkers.length) { console.log(`✓ 章节 ${id} ${name}（无题）`); return }
  const chRaw = await api(`/api/chapters/show?id=${id}`)
  const doc = (chRaw.chapter || chRaw).content
  let replaced = 0
  const walk = (nodes) => {
    for (let i = 0; i < nodes.length; i++) {
      const n = nodes[i]
      if (n.type === 'paragraph') {
        const text = (n.content || []).map((x) => x.text || '').join('').trim()
        const m = text.match(/^%%([A-Z0-9_]+)%%$/)
        if (m && qmap[m[1]]) {
          nodes[i] = { type: 'vue', attrs: { type: 'question', content: String(qmap[m[1]]) } }
          replaced++
          continue
        }
      }
      if (Array.isArray(n.content)) walk(n.content)
    }
  }
  walk(doc.content)
  if (replaced !== expectedMarkers.length) throw new Error(`章节 ${id} 标记替换 ${replaced}/${expectedMarkers.length} 不符`)
  const issues = validateContent(doc)
  if (issues.length) throw new Error(`章节 ${id} 结构自检失败:\n` + issues.join('\n'))
  await api('/api/chapters/update', 'POST', { id, content: doc })
  console.log(`✓ 章节 ${id} ${name}（${replaced} 题）`)
}

/* ---------- 主流程 ---------- */
;(async () => {
  OJ_BASE = await getOjBase({ site: BASE })
  console.log(`OJ base: ${OJ_BASE}`)

  const loginRes = await fetch(BASE + '/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: 'admin', password: 'REDACTED' }),
  }).then((r) => r.json())
  if (!loginRes.success) throw new Error('登录失败: ' + loginRes.msg)
  TOKEN = loginRes.data.token || loginRes.data.auth_token
  console.log('登录 OK')

  const details = JSON.parse(fs.readFileSync(path.join(OUT_DIR, 'details.json'), 'utf8'))
  const titleByPid = Object.fromEntries(details.map((d) => [d.pid, d.title]))
  const allPids = details.map((d) => d.pid)

  // 1. 校验分类：全部 155 题恰好覆盖一次
  const assigned = new Map()
  const expand = (pid) => (pid === 'ALL_S' ? allPids.filter((x) => x.includes('S')) : [pid])
  for (const [key, pids] of Object.entries(CHAPTER_PROBLEMS)) {
    for (const pid of pids.flatMap(expand)) {
      if (assigned.has(pid)) throw new Error(`题目重复分类: ${pid}`)
      assigned.set(pid, key)
    }
  }
  for (const pid of allPids) if (!assigned.has(pid)) throw new Error(`题目未分类: ${pid}`)
  console.log(`分类校验 OK：${assigned.size}/${allPids.length} 题全部覆盖`)

  // 2. 清空旧题（仅首次：checkpoint 不存在时）
  const rows = Array.from({ length: 300 }, (_, i) => ({ courseId: COURSE_ID, cid: i + 1 }))
  if (!fs.existsSync(CHECKPOINT)) {
    await api('/api/questions/batch', 'POST', { rows, action: 'remove' })
    console.log('旧题已清空')
  }

  // 3. 幂等建题：16 道快速检测 + 155 道 OJ
  const qmap = fs.existsSync(CHECKPOINT) ? JSON.parse(fs.readFileSync(CHECKPOINT, 'utf8')) : {}
  for (const q of QUICK) {
    if (qmap[q.key]) { console.log(`${q.key} 已存在 cid=${qmap[q.key]}，跳过`); continue }
    const issues = validateContent(q.content)
    if (issues.length) throw new Error(`${q.key} 题目结构问题: ${issues.join('; ')}`)
    const s = JSON.stringify(q.content)
    if (q.type === 'fill' && !s.includes('"inputs"')) throw new Error(`${q.key} fill 缺 inputs 节点`)
    if (q.type === 'select' && !s.includes('"select"')) throw new Error(`${q.key} select 缺 select 节点`)
    const created = await api('/api/questions/add', 'POST', {
      course_id: COURSE_ID, name: q.name, type: q.type, point: 1, tags: ['ccc7'],
      content: q.content, options: q.options, answer: q.answer,
      ...(q.explanation ? { explanation: q.explanation } : {}),
    })
    qmap[q.key] = created.cid
    console.log(`${q.key} 检测题 cid=${created.cid}`)
  }
  for (const pid of allPids) {
    const key = `OJ_${pid}`
    if (qmap[key]) continue
    const created = await api('/api/questions/add', 'POST', {
      course_id: COURSE_ID, name: `OJ · ${pid} ${titleByPid[pid]}`, type: 'oj', point: 1, tags: ['ccc7'],
      content: pid, options: { pid }, answer: [],
    })
    qmap[key] = created.cid
  }
  console.log(`OJ 题建完：${allPids.length} 道`)
  fs.writeFileSync(CHECKPOINT, JSON.stringify(qmap, null, 2))

  // 4. 删除被合并章节
  await api('/api/chapters/batch', 'POST', { ids: DELETE_CHAPTERS, action: 'remove' })
  console.log(`已删除合并章节: ${DELETE_CHAPTERS.join(',')}`)

  // 5. orders
  await api('/api/courses/update', 'POST', {
    id: COURSE_ID,
    orders: CHAPTERS.map((c, i) => ({ id: String(c.id), label: c.name, parentId: null, order: i })),
  })
  console.log('orders 已更新（11 章顶级）')

  // 6. 逐章填充
  const sections = parseSections()
  for (const c of CHAPTERS) {
    let md = sections[c.key]
    if (md === undefined) throw new Error(`缺少章节内容: ${c.key}`)
    const pids = (CHAPTER_PROBLEMS[c.key] || []).flatMap(expand)
    const problemList = pids.map((pid) => `%%OJ_${pid}%%`).join('\n\n')
    md = md.replace(/%%PROBLEM_LIST%%/g, problemList)
    md = md.replace(/%%INDEX_TABLE%%/g, buildIndexTable())
    const markers = [...c.quick, ...pids.map((pid) => `OJ_${pid}`)]
    await fillChapter(c.id, c.name, md, qmap, markers)
  }

  console.log(`\n✅ 完成：${CHAPTERS.length} 章，${Object.keys(qmap).length} 道题`)
  console.log(`预览: ${BASE}/course/${COURSE_ID}/14`)
})().catch((e) => {
  console.error('❌ 失败:', e.message)
  process.exit(1)
})
