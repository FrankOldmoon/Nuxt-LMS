/**
 * 构建 CCC 多章节课程（course 7）写入 aics.oldmoon.cn
 *
 * 结构：5 个分组（group）+ 17 个子章节，题目与 OJ 实战分散到对应章节
 * 流程：
 *  1. 登录
 *  2. 清理旧版中文题目（course 7 全部 cid）
 *  3. 幂等创建英文题目（checkpoint: storage/oj_problems/qcids.json）
 *  4. 解析 scripts/ccc_tutorial_multi.md（%%%%% 分节），创建缺失章节（复用 id 14 作 "About the CCC"）
 *  5. 写 orders 两级目录树 + 课程简介
 *  6. 逐章填充：markdown 保存 → 取回 → %%Q%% 标记替换为 vue 节点 → 结构自检 → 回存
 *
 * 用法：node scripts/build_ccc_course.cjs
 */
const fs = require('fs')
const path = require('path')
const { getOjBase } = require('./lib/oj-config.cjs')

const BASE = 'https://aics.oldmoon.cn'
// OJ 平台基址取自 BASE 所在站点的系统设置（oj.url），不硬编码；启动时解析
let OJ_BASE = ''
const COURSE_ID = 7
const REUSE = { C11: 14 } // "About the CCC" 复用已有章节 14
const OUT_DIR = path.join(__dirname, '..', 'storage', 'oj_problems')
const CHECKPOINT = path.join(OUT_DIR, 'qcids.json')
const MD_FILE = path.join(__dirname, 'ccc_tutorial_multi.md')

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

/* ---------- tiptap 构建工具 ---------- */
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
  if (node.type === 'heading' && !node.attrs?.id) issues.push('heading missing id: ' + (node.content?.[0]?.text || ''))
  if (node.type === 'codeBlock' && !node.attrs?.language) issues.push('codeBlock missing language')
  if (Array.isArray(node.content)) node.content.forEach((n) => validateContent(n, issues))
  else if (node.content && typeof node.content === 'object') validateContent(node.content, issues)
  return issues
}

/* ---------- 题目定义（英文） ---------- */
const JUDGE = ['Correct', 'Wrong']
const QUESTIONS = [
  { key: 'GQ1', name: 'Part 1 Overview', type: 'judge',
    content: docOf(p('The problems in this course are real CCC problems from 2010 to 2026, hosted on the school OJ.')),
    options: JUDGE, answer: [0] },
  { key: 'Q1', name: 'CCC Basics · Format', type: 'judge',
    content: docOf(p('The CCC is organized by the University of Waterloo. Junior and Senior are two different papers, and you choose one when you register.')),
    options: JUDGE, answer: [0] },
  { key: 'Q2', name: 'CCC Basics · Partial Credit', type: 'judge',
    content: docOf(p('Every problem is scored per test batch (subtask), so even a brute-force solution that handles only small cases earns points — never leave a problem unsubmitted.')),
    options: JUDGE, answer: [0] },
  { key: 'GQ2', name: 'Part 2 Overview', type: 'single',
    content: docOf(p('Which problems need almost nothing but Python syntax?')),
    options: ['J1–J3', 'J4–J5', 'S3–S5', 'S1–S2'], answer: [0] },
  { key: 'Q3', name: 'Syntax · input() Returns', type: 'fill',
    content: docOf(p('input() always returns a ', inputNode('string'), ', so you must call int() before doing any math with it.')),
    options: [''], answer: ['string'] },
  { key: 'Q4', name: 'Syntax · The input() Trap', type: 'single',
    content: docOf(p('Run the code below and type 3. What happens?'), codeBlock('python', 'x = input()', 'print(x + 1)')),
    options: ['It prints 4', 'It prints 31', 'It crashes: you cannot add a string and an integer', 'It prints x + 1'], answer: [2],
    explanation: docOf(p('input() returns the string "3", and "3" + 1 is a type error. Write x = int(input()) instead.')) },
  { key: 'Q5', name: 'Syntax · Conditionals', type: 'single',
    content: docOf(p('Run the speed-fine code above with limit 40 and speed 75. What does it print?')),
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
  { key: 'GQ3', name: 'Part 3 Overview', type: 'multiple',
    content: docOf(p('Which of these are Junior problem types covered in this part?')),
    options: ['Direct calculation', 'String processing', 'Maximum flow', '2D grids'], answer: [0, 1, 3] },
  { key: 'Q9', name: 'Type 1 · J1–J2 Traits', type: 'single',
    content: docOf(p('What do J1 and J2 problems have in common?')),
    options: ['Careful reading + direct calculation is enough', 'They always require BFS', 'They always require recursion', 'They need advanced data structures'], answer: [0] },
  { key: 'Q10', name: 'Type 2 · String Snippets', type: 'multiple',
    content: docOf(p('Which of these Python snippets are valid?')),
    options: ['`len(s)` returns the length of s', '`s[::-1]` reverses s', '`s + 1` appends 1 to the string', "`'*' * 5` gives `'*****'`"],
    answer: [0, 1, 3], explanation: docOf(p('A string cannot be added to a number directly — use str() or an f-string.')) },
  { key: 'Q11', name: 'Type 3 · Enumeration Mindset', type: 'judge',
    content: docOf(p('For From 1987 to 2013, trying year after year from Y+1 sounds "dumb", but when the data range is small it is a correct and reliable solution.')),
    options: JUDGE, answer: [0] },
  { key: 'Q12', name: 'Type 4 · Dictionary Bookkeeping', type: 'judge',
    content: docOf(p('For Wait Time style timeline simulations, a dictionary recording each friend\'s "waiting start time" is a good fit; settle the wait when the S event arrives.')),
    options: JUDGE, answer: [0] },
  { key: 'Q13', name: 'Type 5 · Sunflowers Row Order', type: 'single',
    content: docOf(p('In CCC18J4 the kids may have shuffled the rows. How do you recover the correct order?')),
    options: ['Sort the rows by column 0 (day-1 height) ascending', 'Sort by the last row', 'Transpose the table', 'Subtract 1 from every number'], answer: [0] },
  { key: 'Q19', name: 'Type 5 · Grid Reading', type: 'single',
    content: docOf(p('What is the cleanest way to read a grid of R rows (one string per row)?')),
    options: ['`grid = [input() for _ in range(R)]`', '`grid = input(R)`', '`grid = [input()] * R`', '`read(R, grid)`'], answer: [0],
    explanation: docOf(p('The list comprehension calls input() exactly R times, building a list of R strings.')) },
  { key: 'Q14', name: 'Type 6 · BFS Structure', type: 'select',
    content: docOf(p('The core data structure of BFS (breadth-first search) is a:', selectNode('Queue'))),
    options: ['Stack', 'Queue', 'Heap', 'Linked list'], answer: ['Queue'] },
  { key: 'Q15', name: 'Type 6 · visited Set', type: 'fill',
    content: docOf(p('In the BFS template, the visited set prevents ', inputNode('revisiting'), ' the same cell.')),
    options: [''], answer: ['revisiting'] },
  { key: 'Q16', name: 'Type 6 · Fewest Steps', type: 'single',
    content: docOf(p('Knight Hop asks for the fewest knight jumps between two squares. Which algorithm fits best?')),
    options: ['BFS (breadth-first search)', 'DFS (depth-first search)', 'Greedy', 'Quicksort'], answer: [0],
    explanation: docOf(p('BFS expands layer by layer, so the first time you reach the goal is with the fewest steps.')) },
  { key: 'Q17', name: 'Type 7 · Recursion Essentials', type: 'judge',
    content: docOf(p('Every recursive function must have a base case (an exit), otherwise it recurses forever until the program crashes.')),
    options: JUDGE, answer: [0] },
  { key: 'GQ4', name: 'Part 4 Overview', type: 'judge',
    content: docOf(p('S4–S5 usually require dynamic programming or graph algorithms.')),
    options: JUDGE, answer: [0] },
  { key: 'Q18', name: 'Senior · Greedy Pairing', type: 'single',
    content: docOf(p('In Tandem Bicycle, when d=1 (maximize total speed), the right pairing strategy is:')),
    options: ['Sort one list ascending and the other descending, then pair them up', 'Sort both ascending and pair them up', 'Sort both descending and pair them up', 'Pair randomly'], answer: [0],
    explanation: docOf(p('Ascending paired with descending → every max() picks the larger rider, maximizing the total.')) },
  { key: 'GQ5', name: 'Part 5 Overview', type: 'judge',
    content: docOf(p('Newer CCC years (2024–2026) have friendlier statements and are a good warm-up.')),
    options: JUDGE, answer: [0] },
]

const OJ_QUESTIONS = [
  { key: 'O1', pid: 'CCC24J1', name: '🧪 OJ Practice: CCC24J1 Conveyor Belt Sushi' },
  { key: 'O2', pid: 'CCC19J2', name: '🧪 OJ Practice: CCC19J2 Time to Decompress' },
  { key: 'O3', pid: 'CCC13J3', name: '🧪 OJ Practice: CCC13J3 From 1987 to 2013' },
  { key: 'O4', pid: 'CCC15J4', name: '🧪 OJ Practice: CCC15J4 Wait Time' },
  { key: 'O5', pid: 'CCC18J4', name: '🧪 OJ Practice: CCC18J4 Sunflowers' },
  { key: 'O6', pid: 'CCC10J5', name: '🧪 OJ Practice: CCC10J5 Knight Hop' },
  { key: 'O7', pid: 'CCC21J4', name: '🧪 OJ Practice: CCC21J4 Arranging Books' },
]

/* ---------- 章节定义 ---------- */
const CHAPTERS = [
  { key: 'G1', name: 'Introduction', group: true, questions: ['GQ1'] },
  { key: 'C11', name: 'About the CCC', questions: ['Q1', 'Q2'] },
  { key: 'C12', name: 'Training Roadmap', questions: [] },
  { key: 'G2', name: 'Python Syntax Toolbox', group: true, questions: ['GQ2'] },
  { key: 'C21', name: 'Input and Output', questions: ['Q3', 'Q4'] },
  { key: 'C22', name: 'Conditionals', questions: ['Q5'] },
  { key: 'C23', name: 'Loops', questions: ['Q6'] },
  { key: 'C24', name: 'Strings', questions: ['Q7'] },
  { key: 'C25', name: 'Lists and Sorting', questions: ['Q8'] },
  { key: 'G3', name: 'Junior Problem Types', group: true, questions: ['GQ3'] },
  { key: 'C31', name: 'Direct Calculation (J1–J2)', questions: ['Q9', 'O1'] },
  { key: 'C32', name: 'String Processing', questions: ['Q10', 'O2'] },
  { key: 'C33', name: 'Enumeration and Simulation', questions: ['Q11', 'O3'] },
  { key: 'C34', name: 'Timeline Simulation', questions: ['Q12', 'O4'] },
  { key: 'C35', name: '2D Grids', questions: ['Q13', 'Q19', 'O5'] },
  { key: 'C36', name: 'Search (BFS / DFS)', questions: ['Q14', 'Q15', 'Q16', 'O6'] },
  { key: 'C37', name: 'Recursion and Backtracking', questions: ['Q17'] },
  { key: 'G4', name: 'Senior Sprint', group: true, questions: ['GQ4'] },
  { key: 'C41', name: 'The S1–S5 Route', questions: [] },
  { key: 'C42', name: 'Greedy · Tandem Bicycle', questions: ['Q18', 'O7'] },
  { key: 'G5', name: 'Practice Resources', group: true, questions: ['GQ5'] },
  { key: 'C51', name: '17 Years of Real Problems (2010–2026)', questions: [] },
  { key: 'C52', name: '14-Day Training Plan', questions: [] },
]

/* ---------- 真题索引表 ---------- */
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

/** 解析 multi md 文件 → { key: markdown } */
function parseSections() {
  const raw = fs.readFileSync(MD_FILE, 'utf8')
  const sections = {}
  let cur = null
  for (const line of raw.split('\n')) {
    const m = line.match(/^%%%%%\s*(\S+)\s*/)
    if (m) { cur = m[1]; sections[cur] = []; continue }
    if (cur) sections[cur].push(line)
  }
  for (const k of Object.keys(sections)) sections[k] = sections[k].join('\n').trim()
  return sections
}

/* ---------- 主流程 ---------- */
;(async () => {
  OJ_BASE = await getOjBase({ site: BASE })
  console.log(`OJ base: ${OJ_BASE}`)

  // 1. 登录
  const loginRes = await fetch(BASE + '/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: 'admin', password: process.env.LMS_PASS }),
  }).then((r) => r.json())
  if (!loginRes.success) throw new Error('登录失败: ' + loginRes.msg)
  TOKEN = loginRes.data.token || loginRes.data.auth_token
  console.log('登录 OK')

  // 2. 清理旧版题目（checkpoint 里记录的全部删掉；没有 checkpoint 就删 course 7 的 cid 1-40）
  let oldCids = []
  if (fs.existsSync(CHECKPOINT)) oldCids = Object.values(JSON.parse(fs.readFileSync(CHECKPOINT, 'utf8')))
  else oldCids = Array.from({ length: 40 }, (_, i) => i + 1)
  if (oldCids.length) {
    await api('/api/questions/batch', 'POST', {
      rows: oldCids.map((cid) => ({ courseId: COURSE_ID, cid })), action: 'remove',
    })
    fs.rmSync(CHECKPOINT, { force: true })
    console.log(`旧题目已清理: ${oldCids.length} 道`)
  }

  // 3. 幂等建题（英文）
  const qmap = fs.existsSync(CHECKPOINT) ? JSON.parse(fs.readFileSync(CHECKPOINT, 'utf8')) : {}
  for (const q of [...QUESTIONS, ...OJ_QUESTIONS.map((o) => ({ ...o, type: 'oj' }))]) {
    if (qmap[q.key]) { console.log(`${q.key} 已存在 cid=${qmap[q.key]}，跳过`); continue }
    const body = { course_id: COURSE_ID, name: q.name, type: q.type, point: 1, tags: ['ccc7'] }
    if (q.type === 'oj') {
      body.content = q.pid
      body.options = { pid: q.pid }
      body.answer = []
    } else {
      body.content = q.content
      body.options = q.options
      body.answer = q.answer
      if (q.explanation) body.explanation = q.explanation
      const issues = validateContent(q.content)
      if (issues.length) throw new Error(`${q.key} 题目结构问题: ${issues.join('; ')}`)
      const s = JSON.stringify(q.content)
      if (q.type === 'fill' && !s.includes('"inputs"')) throw new Error(`${q.key} fill 缺 inputs 节点`)
      if (q.type === 'select' && !s.includes('"select"')) throw new Error(`${q.key} select 缺 select 节点`)
    }
    const created = await api('/api/questions/add', 'POST', body)
    qmap[q.key] = created.cid
    console.log(`${q.key} 建题 OK cid=${created.cid} (${q.name})`)
    fs.writeFileSync(CHECKPOINT, JSON.stringify(qmap, null, 2))
  }

  // 4. 解析 md + 创建缺失章节
  const sections = parseSections()
  const missing = CHAPTERS.filter((c) => c.key !== 'C11' && !REUSE[c.key])
  const existing = await api(`/api/courses/show?id=${COURSE_ID}`)
  const byName = {}
  for (const ch of existing.chapters || []) byName[ch.title] = ch.id
  for (const c of missing) {
    if (byName[c.name]) { c.id = byName[c.name]; console.log(`章节已存在: ${c.name} id=${c.id}`); continue }
    const created = await api('/api/chapters/add', 'POST', { name: c.name, courseId: COURSE_ID, isOpen: true })
    c.id = created[0].id
    console.log(`章节创建: ${c.name} id=${c.id}`)
  }
  for (const c of CHAPTERS) if (REUSE[c.key]) c.id = REUSE[c.key]

  // 5. orders 两级目录树 + 课程简介
  const orders = []
  let gOrder = 0
  for (const c of CHAPTERS) {
    if (c.group) {
      orders.push({ id: String(c.id), label: c.name, parentId: null, order: gOrder })
      gOrder++
    } else {
      const parent = orders[orders.length - 1]
      const siblings = orders.filter((o) => o.parentId === parent.id).length
      orders.push({ id: String(c.id), label: c.name, parentId: parent.id, order: siblings })
    }
  }
  await api('/api/courses/update', 'POST', {
    id: COURSE_ID,
    orders,
    content: [
      '## 🍁 CCC Preparation Course',
      '',
      'A complete preparation course for the **Canadian Computing Competition**, built on **155 real problems (2010–2026)** hosted on our own OJ.',
      '',
      '- ✅ Master the Python syntax the Junior paper tests',
      '- ✅ Learn the 7 Junior problem types with worked examples',
      '- ✅ Practice with embedded OJ problems — read, code, submit, AC',
      '- ✅ Sprint into the Senior paper with greedy techniques',
      '',
      ':::callout icon=🎯',
      'Start with Part 1, follow the roadmap, and never leave a problem unsubmitted — partial credit is real points!',
      ':::',
    ].join('\n'),
  })
  console.log('orders 目录树 + 课程简介已更新')

  // 6. 逐章填充
  const allQKeys = Object.keys(qmap)
  let filled = 0
  for (const c of CHAPTERS) {
    let md = sections[c.key]
    if (md === undefined) throw new Error(`章节 ${c.key} 缺少 markdown 内容`)
    md = md.replace(/%%INDEX_TABLE%%/g, buildIndexTable())
    const hasMarkers = /%%[A-Z0-9]+%%/.test(md)
    await api('/api/chapters/update', 'POST', { id: c.id, name: c.name, content: md })
    if (!hasMarkers) { filled++; console.log(`✓ ${c.key} ${c.name} (无题)`); continue }

    const chRaw = await api(`/api/chapters/show?id=${c.id}`)
    const doc = (chRaw.chapter || chRaw).content
    let replaced = 0
    const walk = (nodes) => {
      for (let i = 0; i < nodes.length; i++) {
        const n = nodes[i]
        if (n.type === 'paragraph') {
          const text = (n.content || []).map((x) => x.text || '').join('').trim()
          const m = text.match(/^%%([A-Z0-9]+)%%$/)
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
    const expected = c.questions.length
    if (replaced !== expected) throw new Error(`${c.key} 标记替换 ${replaced}/${expected} 不符`)
    const issues = validateContent(doc)
    if (issues.length) throw new Error(`${c.key} 结构自检失败:\n` + issues.join('\n'))
    await api('/api/chapters/update', 'POST', { id: c.id, content: doc })
    filled++
    console.log(`✓ ${c.key} ${c.name} (${replaced} 题)`)
  }

  console.log(`\n✅ 完成：${filled}/${CHAPTERS.length} 章填充，题目 cid 映射:`, JSON.stringify(qmap))
  const firstChapter = CHAPTERS.find((c) => !c.group)
  console.log(`预览: ${BASE}/course/${COURSE_ID}/${firstChapter.id}`)
})().catch((e) => {
  console.error('❌ 失败:', e.message)
  process.exit(1)
})
