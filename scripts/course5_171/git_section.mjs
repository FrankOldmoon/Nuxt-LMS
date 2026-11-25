/**
 * Append a "save it on MINXIN Git" section to the end of Activity 1 in
 * chapter 171 (course 5, Game Generation), plus a homework that collects the
 * published link.
 *
 * The Git part is the prompt workflow from the front page of 10.28.1.160 -
 * the student copies one prompt, the agent creates the repository, pushes and
 * publishes, and hands back a URL.
 *
 *   node git_section.mjs --dry    # show what would be inserted
 *   node git_section.mjs          # create the homework and insert the section
 */
import postgres from '/Users/oldmoon/Documents/ubuntu/nuxt_lms_2026/node_modules/postgres/src/index.js'

const BASE = process.env.LMS || 'http://10.28.1.151'
const USER = process.env.LMS_USER || 'admin'
const PASS = process.env.LMS_PASS
const COURSE = 5
const CHAPTER = 171
const DRY = process.argv.includes('--dry')

const PA = { indent: null, margin: null, wordWrap: 'normal', textAlign: null, indentUnit: null, lineHeight: 1.75 }
let uid = 0
const nid = () => 'g' + (uid++).toString(36) + Math.random().toString(36).slice(2, 5)
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

const GIT_PROMPT = `My LMS account: <8-digit student ID>
My LMS password: <LMS password>
Git server: http://10.28.1.160
Save the game in this folder into a new repository named my-first-game,
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

/* ------------------------------------------------- homework: the link only */
const HW_NAME = '🔗 Your game on MINXIN Git'
const existing = await sql`select cid from homeworks where course_id = ${COURSE} and name = ${HW_NAME} and deleted_at is null limit 1`
let hwCid = existing[0]?.cid
if (DRY) {
  console.log(`homework "${HW_NAME}" ->`, hwCid ? `reuse cid ${hwCid}` : 'would be created')
} else if (!hwCid) {
  const content = {
    type: 'doc',
    content: [
      { type: 'paragraph', attrs: { ...PA }, content: [t('Paste the published link from the section above - it looks like http://10.28.1.160/<your-id>-my-first-game/ .')] },
      { type: 'paragraph', attrs: { ...PA }, content: [t('Marked on three things: the link opens, the game runs, and what you published is not your first draft - you changed something after play-testing it.')] },
    ],
  }
  const res = await fetch(`${BASE}/api/homeworks/add`, {
    method: 'POST', headers: { 'Content-Type': 'application/json', Cookie: cookie },
    body: JSON.stringify({ course_id: COURSE, name: HW_NAME, content, point: 10 }),
  })
  const body = await res.json().catch(() => null)
  if (!body?.success) { console.error('homework create failed:', JSON.stringify(body).slice(0, 200)); process.exit(1) }
  hwCid = body.data.cid
  console.log(`+ homework cid ${hwCid}  ${HW_NAME}`)
} else {
  console.log(`homework exists, cid ${hwCid}`)
}

/* ----------------------------------------------------------- the new nodes */
const SECTION_MARK = '💾 Save it on MINXIN Git'
const OLD_MARKS = ['🗄️ Save it on MINXIN Git']
const block = [
  h3(SECTION_MARK),
  p('Your game only exists on this computer, which means one broken laptop ends it. Hand the folder to OpenCode and it stores the code on the school Git server, publishes it, and gives you a link you can open on any phone.'),
  table(['Field', 'Use'], [
    ['Account', 'your 8-digit LMS student ID'],
    ['Password', 'your LMS password'],
    ['Do not use', 'your school mailbox address - sign-in fails with it'],
  ]),
  p('This is the prompt from the front page of ', { code: 'http://10.28.1.160' }, ', narrowed to this game:'),
  pre(GIT_PROMPT),
  p('The agent answers with an address like ', { code: 'http://10.28.1.160/<your-id>-my-first-game/' }, '. Open it on your phone - that page is the game running on the school server, not a download.'),
  callout('🔁', ['Changed the game since? Send the same prompt with ', { code: 'Continue my repository my-first-game: <what to change>' }, ' and it updates the same link, so the URL you submit never goes stale.']),
  h3('📤 Submit your game link'),
  p('Paste the published link into the homework below. Three things are checked: the link opens, the game runs, and the version you published is not your first draft.'),
  { type: 'vue', attrs: { type: 'homework', height: null, content: String(hwCid || 0) } },
]

if (DRY) {
  console.log('\nwould insert after the Activity 1 blockquote:')
  block.forEach((x) => {
    if (x.type === 'heading') console.log('  ### ' + x.content[0].text)
    else if (x.type === 'table') x.content.forEach((r) => console.log('    | ' + r.content.map((c) => c.content[0].content.map((y) => y.text || '').join('')).join(' | ')))
    else if (x.type === 'codeBlock') console.log('    [prompt block, ' + x.content[0].text.split('\n').length + ' lines]')
    else if (x.type === 'vue') console.log('    [homework widget cid ' + x.attrs.content + ']')
    else console.log('    ' + x.content.map((y) => y.text || '').join('').slice(0, 90))
  })
  await sql.end()
  process.exit(0)
}

/* ------------------------------------------------------------ insert it in */
const show = await fetch(`${BASE}/api/chapters/show?id=${CHAPTER}`, { headers: { Cookie: cookie } })
const chapter = (await show.json()).data.chapter
const doc = chapter.content
const nodes = doc.content
if (!Array.isArray(nodes)) { console.error('chapter content is not a doc'); process.exit(1) }

const txt = (n) => (!n || typeof n !== 'object' ? '' : n.type === 'text' ? n.text || '' : Array.isArray(n.content) ? n.content.map(txt).join('') : '')

// drop an earlier copy of this section, so re-running does not stack them
const start = nodes.findIndex((n) => n.type === 'heading' && [SECTION_MARK, ...OLD_MARKS].some((m) => txt(n).includes(m)))
if (start >= 0) {
  let end = start + 1
  while (end < nodes.length && !(nodes[end].type === 'heading' && nodes[end].attrs.level <= 3 && !txt(nodes[end]).includes('Submit your game link'))) end++
  nodes.splice(start, end - start)
  console.log(`removed the previous section (${end - start} nodes)`)
}

// Activity 1 ends right before the next h2
const a1 = nodes.findIndex((n) => n.type === 'heading' && n.attrs.level === 2 && txt(n).includes('Activity 1'))
if (a1 < 0) { console.error('Activity 1 heading not found'); process.exit(1) }
let insertAt = nodes.length
for (let i = a1 + 1; i < nodes.length; i++) {
  if (nodes[i].type === 'heading' && nodes[i].attrs.level === 2) { insertAt = i; break }
}
nodes.splice(insertAt, 0, ...block)
console.log(`inserted ${block.length} nodes at position ${insertAt} (Activity 1 ends there)`)

const upd = await fetch(`${BASE}/api/chapters/update`, {
  method: 'POST', headers: { 'Content-Type': 'application/json', Cookie: cookie },
  body: JSON.stringify({ id: CHAPTER, content: doc }),
})
console.log('chapter update:', upd.status, (await upd.text()).slice(0, 140))

/* ----------------------------------------------------------------- verify */
const back = await fetch(`${BASE}/api/chapters/show?id=${CHAPTER}`, { headers: { Cookie: cookie } })
const after = (await back.json()).data.chapter.content.content
const at = after.findIndex((n) => n.type === 'heading' && txt(n).includes(SECTION_MARK))
console.log(`\nchapter ${CHAPTER}: ${after.length} nodes`)
after.slice(Math.max(0, at - 1), at + 10).forEach((n, i) => {
  const tag = n.type === 'heading' ? 'h' + n.attrs.level : n.type === 'vue' ? 'vue:' + n.attrs.type : n.type
  console.log(`  ${at - 1 + i} ${tag.padEnd(12)} ${txt(n).replace(/\s+/g, ' ').slice(0, 70)}`)
})
await sql.end()
