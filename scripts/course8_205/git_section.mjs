/**
 * Add a build-and-publish block to the end of Activity 1 in chapter 205
 * (course 8, Multimodal Human-Computer Interaction).
 *
 *   h3 🤖 Build your own drone game   - one prompt for opencode
 *   h3 💾 Save it on MINXIN Git       - the prompt from 10.28.1.160
 *   h3 📤 Submit your game link       - a new homework that collects the URL
 *
 * The game is deliberately plain HTML + JavaScript with no build step, so the
 * published page is the game. Voice control is written as an optional extra:
 * the Git site is http, and speech recognition needs a secure origin, so the
 * prompt has to degrade to keyboard and touch instead of breaking.
 *
 *   node git_section.mjs --dry
 *   node git_section.mjs
 */
import postgres from '/Users/oldmoon/Documents/ubuntu/nuxt_lms_2026/node_modules/postgres/src/index.js'

const BASE = process.env.LMS || 'http://10.28.1.151'
const USER = process.env.LMS_USER || 'admin'
const PASS = process.env.LMS_PASS
const COURSE = 8
const CHAPTER = 205
const DRY = process.argv.includes('--dry')

const PA = { indent: null, margin: null, wordWrap: 'normal', textAlign: null, indentUnit: null, lineHeight: 1.75 }
let uid = 0
const nid = () => 'd' + (uid++).toString(36) + Math.random().toString(36).slice(2, 5)
const t = (text, marks) => ({ type: 'text', text, ...(marks ? { marks } : {}) })
const seg = (s) =>
  typeof s === 'string' ? t(s)
  : s.code !== undefined ? t(s.code, [{ type: 'code' }])
  : s.bold !== undefined ? t(s.bold, [{ type: 'bold' }])
  : t(s.text)
const p = (...segs) => ({ type: 'paragraph', attrs: { ...PA }, content: segs.map(seg) })
const h3 = (text) => {
  const id = nid()
  return { type: 'heading', attrs: { id, level: 3, ...PA, 'data-toc-id': id }, content: [t(text, [{ type: 'bold' }])] }
}
const HDR = { align: null, color: null, colspan: 1, rowspan: 1, colwidth: null, background: 'rgb(242,243,245)' }
const CELL = { align: null, color: null, colspan: 1, rowspan: 1, colwidth: null, background: null }
const cell = (node, kind) => ({ type: kind, attrs: { ...(kind === 'tableHeader' ? HDR : CELL) }, content: [Array.isArray(node) ? p(...node) : p(node)] })
const table = (headers, rows) => ({
  type: 'table', attrs: { margin: null },
  content: [{ type: 'tableRow', content: headers.map((x) => cell(x, 'tableHeader')) },
    ...rows.map((r) => ({ type: 'tableRow', content: r.map((c) => cell(c, 'tableCell')) }))],
})
const pre = (text, lang = 'text') => ({
  type: 'codeBlock',
  attrs: { theme: 'light', margin: null, language: lang, textWrap: true },
  content: [t(text)],
})
const callout = (icon, text) => ({
  type: 'callout', attrs: { icon, type: 'primary', margin: null, backgroundColor: 'rgb(217, 231, 255)' },
  content: [Array.isArray(text) ? p(...text) : p(text)],
})

const GAME_PROMPT = `Build a browser game called Drone Pilot.

- Fly a drone over a city: collect the glowing rings, dodge the buildings.
- Three levels, each one faster than the last.
- Score, three lives, and a game-over screen with a PLAY AGAIN button.
- Plain HTML, CSS and JavaScript in one folder. No libraries, no build step,
  no assets to download - draw everything with canvas shapes.
- Opening index.html must play the whole game.

Acceptance: I can open index.html and finish a full round without an error in
the console. Tell me the file names when you are done.`

const GIT_PROMPT = `My LMS account: <8-digit student ID>
My LMS password: <LMS password>
Git server: http://10.28.1.160
Save the drone game in this folder into a new repository named drone-pilot,
publish it, and give me the link.
Technical details: http://10.28.1.160/assist.html`

/* ------------------------------------------------------------------ login */
const login = await fetch(`${BASE}/api/auth/login`, {
  method: 'POST', headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ username: USER, password: PASS }),
})
const cookie = (login.headers.getSetCookie?.() || []).map((c) => c.split(';')[0]).join('; ')
if (!login.ok || !cookie) { console.error('login failed', login.status); process.exit(1) }

const sql = postgres(
  process.env.PG,
  { idle_timeout: 10, max: 1 },
)

/* ------------------------------------------------------------- the homework */
const HW_NAME = '🔗 Your drone game'
const existing = await sql`select cid from homeworks where course_id = ${COURSE} and name = ${HW_NAME} and deleted_at is null limit 1`
let hwCid = existing[0]?.cid

const hwContent = {
  type: 'doc',
  content: [
    { type: 'paragraph', attrs: { ...PA }, content: [t('Paste the link to your published drone game - it looks like http://10.28.1.160/<your-id>-drone-pilot/ .')] },
    { type: 'paragraph', attrs: { ...PA }, content: [t('Marked on three things: the link opens, a full round can be played, and what you published is not your first draft - you changed something after play-testing it.')] },
  ],
}

if (DRY) {
  console.log(`homework "${HW_NAME}" ->`, hwCid ? `update cid ${hwCid}` : 'would be created')
} else if (!hwCid) {
  const res = await fetch(`${BASE}/api/homeworks/add`, {
    method: 'POST', headers: { 'Content-Type': 'application/json', Cookie: cookie },
    body: JSON.stringify({ course_id: COURSE, name: HW_NAME, content: hwContent, point: 10 }),
  })
  const body = await res.json().catch(() => null)
  if (!body?.success) { console.error('homework create failed:', JSON.stringify(body).slice(0, 200)); process.exit(1) }
  hwCid = body.data.cid
  console.log(`+ homework cid ${hwCid}  ${HW_NAME}`)
} else {
  const res = await fetch(`${BASE}/api/homeworks/update`, {
    method: 'POST', headers: { 'Content-Type': 'application/json', Cookie: cookie },
    body: JSON.stringify({ course_id: COURSE, id: hwCid, name: HW_NAME, content: hwContent, point: 10 }),
  })
  console.log(`~ homework cid ${hwCid} updated: ${res.status}`)
}

/* ---------------------------------------------------------------- the block */
const MARK = '🚁 Build your own drone game'
const OLD_MARKS = ['🤖 Build your own drone game']
const block = [
  h3(MARK),
  p('This is the assignment for this chapter: build a drone game of your own with OpenCode. Open an empty folder in OpenCode and paste this prompt - change the details to whatever you want your game to be.'),
  pre(GAME_PROMPT),
  p('Play it before you touch anything else. If a rule feels wrong, send one more prompt about that rule only.'),

  h3('💾 Save it on MINXIN Git'),
  p('Right now the game lives in one folder on one computer. Hand it to OpenCode and it stores the code on the school Git server, publishes it, and returns a link you can open on a phone.'),
  table(['Field', 'Use'], [
    ['Account', 'your 8-digit LMS student ID'],
    ['Password', 'your LMS password'],
    ['Do not use', 'your school mailbox address - sign-in fails with it'],
  ]),
  p('This is the prompt from the front page of ', { code: 'http://10.28.1.160' }, ', pointed at this game:'),
  pre(GIT_PROMPT),
  p('The agent answers with an address like ', { code: 'http://10.28.1.160/<your-id>-drone-pilot/' }, '. That page is the game running on the school server - send it to a classmate and they can play it without installing anything.'),
  callout('🔁', ['Still tuning it? Send the same prompt with ', { code: 'Continue my repository drone-pilot: <what to change>' }, ' and it updates the same link, so the URL you submit never goes stale.']),

  h3('📤 Submit your game link'),
  p('Paste the published link into the homework below.'),
  { type: 'vue', attrs: { type: 'homework', height: null, content: String(hwCid || 0) } },
]

const txt = (n) => (!n || typeof n !== 'object' ? '' : n.type === 'text' ? n.text || '' : Array.isArray(n.content) ? n.content.map(txt).join('') : '')

if (DRY) {
  console.log('\nwould append to Activity 1:')
  block.forEach((x) => {
    if (x.type === 'heading') console.log('  ### ' + x.content[0].text)
    else if (x.type === 'table') x.content.forEach((r) => console.log('    | ' + r.content.map((c) => txt(c)).join(' | ')))
    else if (x.type === 'codeBlock') console.log('    [prompt, ' + x.content[0].text.split('\n').length + ' lines]')
    else if (x.type === 'vue') console.log('    [homework widget cid ' + x.attrs.content + ']')
    else console.log('    ' + txt(x).slice(0, 100))
  })
  await sql.end()
  process.exit(0)
}

/* ---------------------------------------------------------------- insert */
const show = await fetch(`${BASE}/api/chapters/show?id=${CHAPTER}`, { headers: { Cookie: cookie } })
const chapter = (await show.json()).data.chapter
const doc = chapter.content
const nodes = doc.content
if (!Array.isArray(nodes)) { console.error('chapter content is not a doc'); process.exit(1) }

// an older run may have left an orphaned tail (a Save/Submit pair with no opener)
const savings = nodes.map((n, i) => ({ n, i })).filter((x) => x.n.type === 'heading' && txt(x.n).includes('Save it on MINXIN Git'))
if (savings.length > 1) {
  const from = savings[0].i
  let to = from + 1
  while (to < nodes.length && !(nodes[to].type === 'heading' && txt(nodes[to]).includes('Build your own drone game'))) to++
  nodes.splice(from, to - from)
  console.log(`removed an orphaned tail (${to - from} nodes)`)
}

// drop an earlier copy so re-running does not stack sections
const start = nodes.findIndex((n) => n.type === 'heading' && [MARK, ...OLD_MARKS].some((m) => txt(n).includes(m)))
if (start >= 0) {
  // the block spans several h3 sections, so cut to the next h2, not the next heading
  let end = start
  while (end < nodes.length && !(end > start && nodes[end].type === 'heading' && nodes[end].attrs.level === 2)) end++
  nodes.splice(start, end - start)
  console.log(`removed the previous block (${end - start} nodes)`)
}

// Activity 1 ends right before the next h2
const a1 = nodes.findIndex((n) => n.type === 'heading' && n.attrs.level === 2 && txt(n).includes('Activity 1'))
if (a1 < 0) { console.error('Activity 1 not found'); process.exit(1) }
let insertAt = nodes.length
for (let i = a1 + 1; i < nodes.length; i++) {
  if (nodes[i].type === 'heading' && nodes[i].attrs.level === 2) { insertAt = i; break }
}
nodes.splice(insertAt, 0, ...block)
console.log(`inserted ${block.length} nodes at position ${insertAt}`)

const upd = await fetch(`${BASE}/api/chapters/update`, {
  method: 'POST', headers: { 'Content-Type': 'application/json', Cookie: cookie },
  body: JSON.stringify({ id: CHAPTER, content: doc }),
})
console.log('chapter update:', upd.status, (await upd.text()).slice(0, 140))

/* ---------------------------------------------------------------- verify */
const back = await fetch(`${BASE}/api/chapters/show?id=${CHAPTER}`, { headers: { Cookie: cookie } })
const after = (await back.json()).data.chapter.content.content
const at = after.findIndex((n) => n.type === 'heading' && txt(n).includes(MARK))
console.log(`\nchapter ${CHAPTER}: ${after.length} nodes`)
after.slice(Math.max(0, at - 2), at + 12).forEach((n, i) => {
  const tag = n.type === 'heading' ? 'h' + n.attrs.level : n.type === 'vue' ? 'vue:' + n.attrs.type : n.type
  console.log(`  ${at - 2 + i} ${tag.padEnd(12)} ${txt(n).replace(/\s+/g, ' ').slice(0, 68)}`)
})
await sql.end()
