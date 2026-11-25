/**
 * 构建 AI Agent 使用教程课程（course 20）写入 aics.oldmoon.cn
 *
 * 主题：AI Agent 使用教程（WorkBuddy / Codex / Claude Code 等工具类 agent 的实战用法）
 * 结构：6 个分组（group）+ 21 个子章节，每章 2 道配套练习（题型多样）
 * 流程（复用 build_ibcs_course.cjs 模式，含 currentGroup 修复 + top 顶级章节支持）：
 *  1. 登录
 *  2. 幂等创建题目（checkpoint: storage/oj_problems/agent_qcids.json）
 *  3. 解析 scripts/agent_tutorial.md（%%%%% 分节），创建缺失章节（复用 id 651 作 "What is an AI Agent?"）
 *  4. 写 orders 两级目录树 + 课程简介
 *  5. 逐章填充：markdown 保存 → 取回 → %%Q%% 标记替换为 vue 节点 → 结构自检 → 回存
 *
 * 用法：node scripts/build_agent_course.cjs
 */
const fs = require('fs')
const path = require('path')

const BASE = 'https://aics.oldmoon.cn'
const COURSE_ID = 20
const REUSE = { A01: 651 } // "What is an AI Agent?" 复用已有章节 651
const OUT_DIR = path.join(__dirname, '..', 'storage', 'oj_problems')
const CHECKPOINT = path.join(OUT_DIR, 'agent_qcids.json')
const MD_FILE = path.join(__dirname, 'agent_tutorial.md')

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

/* ---------- 题目定义 ---------- */
const JUDGE = ['Correct ✅', 'Wrong ❌']
const CORRECT = [0]
const WRONG = [1]
const sortAns = (n) => Array.from({ length: n }, (_, i) => i)
const matchAns = (n) => Array.from({ length: n }, (_, i) => i)

const QUESTIONS = [
  /* ===== A01 What is an AI Agent ===== */
  { key: 'Q1', type: 'sort',
    content: docOf(p('🔄 Put the agent loop steps in order:')),
    options: ['Perceive: read the request and context', 'Think: break the goal into steps', 'Act: call a tool (file, web, shell)', 'Observe: check the result and continue'],
    answer: sortAns(4) },
  { key: 'Q2', type: 'single',
    content: docOf(p('What is the key difference between a chatbot and an AI agent?')),
    options: ['Agents are always smarter than chatbots',
      'Agents can take actions with tools (files, web, code) to complete multi-step goals',
      'Chatbots cannot answer questions',
      'Agents never make mistakes'], answer: [1] },
  /* ===== A02 Meet the Agents ===== */
  { key: 'Q3', type: 'classify',
    content: docOf(p('🧭 Classify each tool:')),
    options: [
      { name: 'Coding agent (CLI) ⌨️', items: ['Codex', 'Claude Code'] },
      { name: 'Desktop assistant 🖥️', items: ['WorkBuddy', 'Editor copilot'] }],
    answer: [0, 0, 1, 1] },
  { key: 'Q4', type: 'single',
    content: docOf(p('You need a multi-day refactor of a large codebase. Which tool fits best?')),
    options: ['A CLI coding agent inside the repo', 'A web chat window', 'A calculator', 'Autocomplete only'], answer: [0] },
  /* ===== A03 Setup ===== */
  { key: 'Q5', type: 'sort',
    content: docOf(p('🛠️ Put the first-agent setup steps in order:')),
    options: ['Install the agent and sign in', 'Pick a dedicated project workspace', 'Review its tool permissions', 'Give it a small first task and review the result'],
    answer: sortAns(4) },
  { key: 'Q6', type: 'fill',
    content: docOf(p('Agents work best inside a dedicated project ', inputNode('workspace'), ' (folder), which limits the blast radius if something goes wrong.')),
    options: [''], answer: ['workspace'] },
  /* ===== A04 Anatomy of a Prompt ===== */
  { key: 'Q7', type: 'sort',
    content: docOf(p('🧠 Put the four parts of a strong prompt in order:')),
    options: ['Goal: what "done" looks like', 'Context: background and files', 'Constraints: rules and limits', 'Format: the shape of the output'],
    answer: sortAns(4) },
  { key: 'Q8', type: 'single',
    content: docOf(p('Which prompt follows the G.C.C.F. checklist best?')),
    options: ['"Write about volcanoes"',
      '"Write a 200-word volcano intro for Grade 8 (audience), covering formation + one eruption (goal), simple vocabulary (constraint), ending with 3 quiz questions (format)"',
      '"Volcanoes!!"',
      '"Write everything you know about volcanoes, 50 pages"'], answer: [1] },
  /* ===== A05 Context ===== */
  { key: 'Q9', type: 'multiple',
    content: docOf(p('Which of these are good context to give an agent?')),
    options: ['A sample of the style you want', 'The audience and purpose', 'Your passwords so it can log in for you', 'The exact error message from a crash'], answer: [0, 1, 3],
    explanation: docOf(p('Never share credentials — replace secrets with placeholders.')) },
  { key: 'Q10', type: 'judge',
    content: docOf(p('Copy-pasting every file manually is the best way to give a desktop agent context, even when it can read the project folder itself.')),
    options: JUDGE, answer: WRONG,
    explanation: docOf(p('Point the agent at the folder and let it fetch what it needs.')) },
  /* ===== A06 Iterating ===== */
  { key: 'Q11', type: 'single',
    content: docOf(p('The agent is 20 steps into a task and the direction feels wrong. What is the best move?')),
    options: ['Let it finish — it might fix itself',
      'Stop now, ask it to summarise what it did, and steer before continuing',
      'Delete everything and start from zero',
      'Give it more context about something unrelated'], answer: [1] },
  { key: 'Q12', type: 'fill',
    content: docOf(p('Ask the agent to ', inputNode('summarise'), ' its progress when a run gets long — then confirm the plan before continuing.')),
    options: [''], answer: ['summarise'] },
  /* ===== A07 Research ===== */
  { key: 'Q13', type: 'judge',
    content: docOf(p('It is fine to cite a source the agent gave you without opening it, as long as the title looks real.')),
    options: JUDGE, answer: WRONG,
    explanation: docOf(p('Agents sometimes produce plausible-but-wrong links. Open 1–2 sources yourself.')) },
  { key: 'Q14', type: 'single',
    content: docOf(p('Which research prompt is most likely to produce verifiable results?')),
    options: ['"Tell me about renewable energy"',
      '"Compare 3 recent sources on solar costs; give a summary, a source-vs-claim table, and 2 things I should verify"',
      '"Is solar good or bad? One word"',
      '"Write my whole presentation and don\'t show sources"'], answer: [1] },
  /* ===== A08 Writing ===== */
  { key: 'Q15', type: 'select',
    content: docOf(p('In the recommended writing workflow, whose job is the argument/outline? ', selectNode('Yours — the agent expands and formats, you supply the thinking'))),
    options: ['The agent\'s — it knows best', 'Yours — the agent expands and formats, you supply the thinking', 'Nobody\'s — it emerges by itself', 'The format\'s'], answer: ['Yours — the agent expands and formats, you supply the thinking'] },
  { key: 'Q16', type: 'single',
    content: docOf(p('You need a formatted deliverable (.docx / .pptx). What should you ask for?')),
    options: ['Plain text only — agents cannot make files',
      'Ask the agent to output the actual file, then edit it yourself like any other draft',
      'A screenshot of text',
      'Never ask for files'], answer: [1] },
  /* ===== A09 Coding ===== */
  { key: 'Q17', type: 'single',
    content: docOf(p('Your code crashes with a KeyError. What should you give the agent?')),
    options: ['"It doesn\'t work, fix it"',
      'The exact error message plus steps to reproduce',
      'Only the file name',
      'A screenshot of your desk'], answer: [1],
    explanation: docOf(p('A stack trace sends the agent straight to the root cause; vagueness sends it guessing.')) },
  { key: 'Q18', type: 'fill',
    content: docOf(p('The golden rule of agent coding: ask the agent to ', inputNode('run'), ' the code and show the output — "looks right" and "runs right" are different.')),
    options: [''], answer: ['run'] },
  /* ===== A10 Data ===== */
  { key: 'Q19', type: 'sort',
    content: docOf(p('📊 Put the data-analysis loop in order:')),
    options: ['Point the agent at the data', 'State the question precisely', 'Ask it to clean the data and show issues first', 'Ask for the artifact (chart/table) and its limitations'],
    answer: sortAns(4) },
  { key: 'Q20', type: 'classify',
    content: docOf(p('🧹 Which request belongs to which phase?')),
    options: [
      { name: 'Cleaning 🧹', items: ['"Show me rows with missing values"', '"List duplicate entries"'] },
      { name: 'Analysis 📈', items: ['"Which class improved most?"', '"Plot the average per week"'] }],
    answer: [0, 0, 1, 1] },
  /* ===== A11 Tools & Permissions ===== */
  { key: 'Q21', type: 'sort',
    content: docOf(p('🎚️ Order the permission ladder from lowest to highest risk:')),
    options: ['Read-only (view files, search)', 'Write (edit workspace files)', 'Execute (run commands)', 'External (post, email, pay)'],
    answer: sortAns(4) },
  { key: 'Q22', type: 'single',
    content: docOf(p('The agent asks permission to run a command you don\'t understand. What do you do?')),
    options: ['Approve — agents know best', 'Ask the agent to explain the command first, then decide', 'Approve everything at once to save time', 'Throw the laptop'], answer: [1] },
  /* ===== A12 Skills ===== */
  { key: 'Q23', type: 'fill',
    content: docOf(p('If you keep re-explaining the same workflow every session, that is a ', inputNode('skill'), ' waiting to be created — teach once, reuse forever.')),
    options: [''], answer: ['skill'] },
  { key: 'Q24', type: 'multiple',
    content: docOf(p('Which are ways to customise an agent?')),
    options: ['Install skills from a marketplace', 'Write a project AGENTS.md with conventions', 'Set standing custom instructions (preferences)', 'Recite magic words for better luck'], answer: [0, 1, 2] },
  /* ===== A13 Automations ===== */
  { key: 'Q25', type: 'single',
    content: docOf(p('Which is the best-designed automation prompt?')),
    options: ['"Do the thing we talked about"', '"Every morning at 8am: summarise today\'s top AI news, one paragraph each, deliver as a report"', '"Check stuff sometimes"', '"Remind me about that important thing"'], answer: [1],
    explanation: docOf(p('Future runs cannot see this conversation — the prompt must be self-contained and deliver a final result.')) },
  { key: 'Q26', type: 'judge',
    content: docOf(p('Before trusting an automation, you should check its first outputs — start paused or manual, then let it run.')),
    options: JUDGE, answer: CORRECT },
  /* ===== A14 Memory ===== */
  { key: 'Q27', type: 'single',
    content: docOf(p('What is the best way to stop an agent re-asking your basic setup every session?')),
    options: ['Tell it your stable facts once — profile/custom instructions and project memory persist', 'Type it again every time', 'Use a longer password', 'Buy a new computer'], answer: [0] },
  { key: 'Q28', type: 'fill',
    content: docOf(p('Memory is editable, not permanent — if the agent misremembers something, ', inputNode('correct'), ' it and the memory updates.')),
    options: [''], answer: ['correct'] },
  /* ===== A15 CLI Agents ===== */
  { key: 'Q29', type: 'sort',
    content: docOf(p('⌨️ Put the CLI coding-agent loop in order:')),
    options: ['Plan: agent reads the repo and proposes a plan', 'Approve: you read and correct the plan', 'Apply: agent edits files and runs tests', 'Review: you check the diff before it\'s final'],
    answer: sortAns(4) },
  { key: 'Q30', type: 'single',
    content: docOf(p('What is AGENTS.md / CLAUDE.md in a project?')),
    options: ['A game save file', 'Instructions the agent reads automatically: build commands, style rules, restricted areas', 'A replacement for the code', 'An antivirus config'], answer: [1] },
  /* ===== A16 Codebase ===== */
  { key: 'Q31', type: 'single',
    content: docOf(p('Which task briefing works best for an agent in a big repo?')),
    options: ['"Improve the app"', '"Add validation to the signup form in server/api; all tests must pass; add one new test"', '"Do everything"', '"Refactor the whole repo overnight"'], answer: [1] },
  { key: 'Q32', type: 'judge',
    content: docOf(p('You should commit (or back up) to a known-good state before letting an agent do a broad refactor.')),
    options: JUDGE, answer: CORRECT,
    explanation: docOf(p('A diff against a known-good state is your undo button.')) },
  /* ===== A17 Reviewing AI Code ===== */
  { key: 'Q33', type: 'classify',
    content: docOf(p('🕵️ Classify each review finding:')),
    options: [
      { name: 'Security issue 🔓', items: ['Hardcoded API key', 'Unsanitised user input in SQL'] },
      { name: 'Over-engineering 🎁', items: ['300 lines + a design pattern where 10 lines would do', 'A factory class for one object'] }],
    answer: [0, 0, 1, 1] },
  { key: 'Q34', type: 'single',
    content: docOf(p('The agent used a library function that doesn\'t exist. What is this called and how do you catch it?')),
    options: ['A feature — applaud it', 'A hallucinated API — catch it by actually running the code', 'A commit message', 'A git hook'], answer: [1] },
  /* ===== A18 Hallucinations ===== */
  { key: 'Q35', type: 'judge',
    content: docOf(p('If an agent states a fact very confidently, it is probably correct — confidence means correctness.')),
    options: JUDGE, answer: WRONG,
    explanation: docOf(p('Confidence is not correctness. Verify by default, especially numbers, dates, quotes and citations.')) },
  { key: 'Q36', type: 'multiple',
    content: docOf(p('Which claims deserve EXTRA verification?')),
    options: ['Exact statistics and dates', 'Direct quotations and citations', '"Recent news" events', 'The agent\'s opinion on pizza toppings'], answer: [0, 1, 2] },
  /* ===== A19 Privacy ===== */
  { key: 'Q37', type: 'multiple',
    content: docOf(p('Which should NEVER be pasted into an AI agent?')),
    options: ['Passwords and API keys', 'Other people\'s personal data', 'Confidential documents you have no right to share', 'Your favourite Python library'], answer: [0, 1, 2] },
  { key: 'Q38', type: 'single',
    content: docOf(p('You must share a config file that contains an API key. What do you do?')),
    options: ['Paste it as-is — it\'s fine', 'Redact: replace the key with a placeholder like API_KEY=***', 'Email it to the agent', 'Post it on social media first'], answer: [1] },
  /* ===== A20 Academic Integrity ===== */
  { key: 'Q39', type: 'classify',
    content: docOf(p('🚦 Classify each AI use:')),
    options: [
      { name: 'Usually fine 🟢', items: ['Explaining a concept you\'re stuck on', 'Feedback on your own draft'] },
      { name: 'Usually not 🔴', items: ['Submitting AI writing as your own', 'Fabricating citations'] }],
    answer: [0, 0, 1, 1] },
  { key: 'Q40', type: 'judge',
    content: docOf(p('If an assignment doesn\'t mention AI at all, you may assume unlimited AI use is allowed.')),
    options: JUDGE, answer: WRONG,
    explanation: docOf(p('Read the school/subject policy and ask the teacher when unclear — then declare your AI use.')) },
  /* ===== A21 Human in the Loop ===== */
  { key: 'Q41', type: 'sort',
    content: docOf(p("👨‍✈️ Put the pilot's checklist in order:")),
    options: ['Set the goal yourself', 'Understand the agent\'s output before accepting', 'Verify the result (tests, sources, sense)', 'Learn from the process'],
    answer: sortAns(4) },
  { key: 'Q42', type: 'fill',
    content: docOf(p('Agents optimise the ', inputNode('goal'), ' you set — a wrong goal executed perfectly is still wrong.')),
    options: [''], answer: ['goal'] },
  /* ===== Group overview questions ===== */
  { key: 'GQ1', type: 'judge',
    content: docOf(p('An AI agent can use tools — files, web, code — to complete multi-step goals, not just answer messages.')),
    options: JUDGE, answer: CORRECT },
  { key: 'GQ2', type: 'single',
    content: docOf(p('What does the G in the G.C.C.F. prompting checklist stand for?')),
    options: ['Grammar', 'Goal', 'Google', 'Gigabytes'], answer: [1] },
  { key: 'GQ3', type: 'single',
    content: docOf(p('Which is NOT one of the four core workflows in this course?')),
    options: ['Research & summaries', 'Writing & documents', 'Coding with agents', 'Mining cryptocurrency'], answer: [3] },
  { key: 'GQ4', type: 'judge',
    content: docOf(p('Agents can run scheduled automations — for example a daily news briefing at 8am.')),
    options: JUDGE, answer: CORRECT },
  { key: 'GQ5', type: 'single',
    content: docOf(p('For a coding agent\'s first look at an unfamiliar repo, which mode should you start in?')),
    options: ['Full-access apply mode', 'Plan / read-only mode', 'Airplane mode', 'Turbo mode'], answer: [1] },
  { key: 'GQ6', type: 'judge',
    content: docOf(p('The best agent users delegate everything and verify nothing.')),
    options: JUDGE, answer: WRONG,
    explanation: docOf(p('Stay the pilot: set goals, understand outputs, verify results.')) },
]

/* ---------- 章节定义 ---------- */
const CHAPTERS = [
  { key: 'G01', name: 'Getting Started', group: true },
  { key: 'A01', name: 'What is an AI Agent?' },
  { key: 'A02', name: 'Meet the Agents' },
  { key: 'A03', name: 'Set Up Your First Agent' },
  { key: 'G02', name: 'Prompting & Context', group: true },
  { key: 'A04', name: 'Anatomy of a Good Prompt' },
  { key: 'A05', name: 'Giving Context that Matters' },
  { key: 'A06', name: 'Iterating with Follow-ups' },
  { key: 'G03', name: 'Core Workflows', group: true },
  { key: 'A07', name: 'Research & Summaries' },
  { key: 'A08', name: 'Writing & Documents' },
  { key: 'A09', name: 'Coding with Agents' },
  { key: 'A10', name: 'Data & Analysis' },
  { key: 'G04', name: 'Agentic Superpowers', group: true },
  { key: 'A11', name: 'Tools & Permissions' },
  { key: 'A12', name: 'Skills & Customisation' },
  { key: 'A13', name: 'Automations & Schedules' },
  { key: 'A14', name: 'Memory & Personalisation' },
  { key: 'G05', name: 'Coding Agents Deep-Dive', group: true },
  { key: 'A15', name: 'CLI Agents: Codex, Claude Code & Friends' },
  { key: 'A16', name: 'Working with a Codebase' },
  { key: 'A17', name: 'Reviewing AI-Generated Code' },
  { key: 'G06', name: 'Best Practices & Safety', group: true },
  { key: 'A18', name: 'Hallucinations & Verification' },
  { key: 'A19', name: 'Privacy & Data Safety' },
  { key: 'A20', name: 'Academic Integrity & AI' },
  { key: 'A21', name: 'Human in the Loop' },
]

/* ---------- 解析 md → { key: markdown } ---------- */
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

/** 抽取某节 markdown 里的 %%KEY%% 标记 */
function extractMarkers(md) {
  const keys = []
  for (const line of md.split('\n')) {
    const m = line.match(/^%%([A-Z0-9]+)%%\s*$/)
    if (m) keys.push(m[1])
  }
  return keys
}

/* ---------- 主流程 ---------- */
;(async () => {
  // 1. 登录
  const loginRes = await fetch(BASE + '/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: 'admin', password: process.env.LMS_PASS }),
  }).then((r) => r.json())
  if (!loginRes.success) throw new Error('登录失败: ' + loginRes.msg)
  TOKEN = loginRes.data.token || loginRes.data.auth_token
  console.log('登录 OK')

  const sections = parseSections()
  const qmap = fs.existsSync(CHECKPOINT) ? JSON.parse(fs.readFileSync(CHECKPOINT, 'utf8')) : {}

  // 2. 幂等建题：以 md 标记为准，只建每章用到的题
  const defined = new Map(QUESTIONS.map((q) => [q.key, q]))
  const usedKeys = new Set()
  for (const c of CHAPTERS) {
    const md = sections[c.key]
    if (md === undefined) throw new Error(`章节 ${c.key} 缺少 markdown 内容`)
    for (const k of extractMarkers(md)) usedKeys.add(k)
  }
  const missing = [...usedKeys].filter((k) => !defined.has(k))
  if (missing.length) throw new Error('以下标记没有题目定义: ' + missing.join(', '))
  console.log(`共 ${usedKeys.size} 道题需要创建`)

  for (const key of usedKeys) {
    if (qmap[key]) { console.log(`${key} 已存在 cid=${qmap[key]}，跳过`); continue }
    const q = defined.get(key)
    const body = { course_id: COURSE_ID, name: `AGENT ${key}`, type: q.type, point: 5, tags: ['agent'] }
    body.content = q.content
    body.options = q.options
    body.answer = q.answer
    if (q.explanation) body.explanation = q.explanation
    const issues = validateContent(q.content)
    if (issues.length) throw new Error(`${key} 题目结构问题: ${issues.join('; ')}`)
    const s = JSON.stringify(q.content)
    if (q.type === 'fill' && !s.includes('"inputs"')) throw new Error(`${key} fill 缺 inputs 节点`)
    if (q.type === 'select' && !s.includes('"select"')) throw new Error(`${key} select 缺 select 节点`)
    const created = await api('/api/questions/add', 'POST', body)
    qmap[key] = created.cid
    console.log(`${key} 建题 OK cid=${created.cid} (${q.type})`)
    fs.writeFileSync(CHECKPOINT, JSON.stringify(qmap, null, 2))
  }

  // 3. 创建缺失章节（按名字幂等）
  const existing = await api(`/api/courses/show?id=${COURSE_ID}`)
  const byName = {}
  for (const ch of existing.chapters || []) byName[ch.title] = ch.id
  for (const c of CHAPTERS) {
    if (REUSE[c.key]) { c.id = REUSE[c.key]; continue }
    if (byName[c.name]) { c.id = byName[c.name]; console.log(`章节已存在: ${c.name} id=${c.id}`); continue }
    const created = await api('/api/chapters/add', 'POST', { name: c.name, courseId: COURSE_ID, isOpen: true })
    c.id = created[0].id
    console.log(`章节创建: ${c.name} id=${c.id}`)
  }

  // 4. orders 两级目录树 + 课程简介（currentGroup 修复版）
  const orders = []
  let gOrder = 0
  let currentGroup = null
  for (const c of CHAPTERS) {
    if (c.group) {
      orders.push({ id: String(c.id), label: c.name, parentId: null, order: gOrder })
      currentGroup = String(c.id)
      gOrder++
    } else if (c.top) {
      orders.push({ id: String(c.id), label: c.name, parentId: null, order: gOrder })
      gOrder++
    } else {
      orders.push({ id: String(c.id), label: c.name, parentId: currentGroup, order: orders.filter((o) => o.parentId === currentGroup).length })
    }
  }
  await api('/api/courses/update', 'POST', {
    id: COURSE_ID,
    orders,
    content: [
      '## 🤖 Working with AI Agents',
      '',
      'A hands-on course for using **AI agents** — tools like **WorkBuddy** and **Codex** that don\'t just chat, but actually *do* the work: files, web, code, schedules.',
      '',
      '- 🚀 **Start right**: what agents are, which tool fits which job, safe setup',
      '- 💬 **Prompt like a pro**: goals, context, constraints, format — and how to iterate',
      '- 🧰 **Core workflows**: research, writing, coding, data analysis',
      '- ⚡ **Superpowers**: tools & permissions, skills, automations, memory',
      '- 💻 **Coding agents**: plan → apply → review loops with Codex / Claude Code',
      '- 🛡️ **Stay safe**: hallucination checks, privacy, academic integrity, human-in-the-loop',
      '',
      ':::callout icon=🎯',
      'One principle runs through the whole course: **the agent does the typing, you stay the pilot.**',
      ':::',
    ].join('\n'),
  })
  console.log('orders 目录树 + 课程简介已更新')

  // 5. 逐章填充
  let filled = 0
  for (const c of CHAPTERS) {
    let md = sections[c.key]
    const markers = extractMarkers(md)
    const hasMarkers = markers.length > 0
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
            nodes[i] = { type: 'vue', attrs: { type: 'question', height: null, content: String(qmap[m[1]]) } }
            replaced++
            continue
          }
        }
        if (Array.isArray(n.content)) walk(n.content)
      }
    }
    walk(doc.content)
    if (replaced !== markers.length) throw new Error(`${c.key} 标记替换 ${replaced}/${markers.length} 不符`)
    const issues = validateContent(doc)
    if (issues.length) throw new Error(`${c.key} 结构自检失败:\n` + issues.join('\n'))
    await api('/api/chapters/update', 'POST', { id: c.id, content: doc })
    filled++
    console.log(`✓ ${c.key} ${c.name} (${replaced} 题)`)
  }

  console.log(`\n✅ 完成：${filled}/${CHAPTERS.length} 章填充，题目 cid 映射:`, JSON.stringify(qmap))
  const first = CHAPTERS.find((c) => !c.group)
  console.log(`预览: ${BASE}/course/${COURSE_ID}/${first.id}`)
})().catch((e) => {
  console.error('❌ 失败:', e.message)
  process.exit(1)
})
