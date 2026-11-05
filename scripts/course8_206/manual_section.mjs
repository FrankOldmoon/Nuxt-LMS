/**
 * In chapter 206 (course 8, Regulation and Law) Activity 2, put the Word step
 * before the homework: the student asks opencode to build a real .docx manual,
 * then submits that file instead of three lines typed into the box.
 *
 *   h3 📄 Build the manual in Word   - one prompt, python-docx, a real table
 *   h3 📤 Submit your homework       - now asks for the file
 *
 *   node manual_section.mjs --dry
 *   node manual_section.mjs
 */
import postgres from '/Users/oldmoon/Documents/ubuntu/nuxt_lms_2026/node_modules/postgres/src/index.js'

const BASE = process.env.LMS || 'http://10.28.1.151'
const USER = process.env.LMS_USER || 'admin'
const PASS = process.env.LMS_PASS || 'REDACTED'
const COURSE = 8
const CHAPTER = 206
const HW_CID = 14
const DRY = process.argv.includes('--dry')

const PA = { indent: null, margin: null, wordWrap: 'normal', textAlign: null, indentUnit: null, lineHeight: 1.75 }
let uid = 0
const nid = () => 'm' + (uid++).toString(36) + Math.random().toString(36).slice(2, 5)
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
const pre = (text, lang = 'text') => ({
  type: 'codeBlock',
  attrs: { theme: 'light', margin: null, language: lang, textWrap: true },
  content: [t(text)],
})
const callout = (icon, text) => ({
  type: 'callout', attrs: { icon, type: 'primary', margin: null, backgroundColor: 'rgb(217, 231, 255)' },
  content: [Array.isArray(text) ? p(...text) : p(text)],
})
const doc = (...paragraphs) => ({ type: 'doc', content: paragraphs })

const MANUAL_PROMPT = `Build a drone safety manual as a real Word file.

Use python-docx: pip install python-docx if it is missing.
Write a script make_manual.py that creates manual.docx, then run it
(python3 on macOS and Linux, python on Windows).

The document, in English, A4, about two pages:
- Title: School Drone Club - Flight Safety Manual, then one line with a blank
  for the date and a blank for the pilot's name.
- Heading 1 "1. Our three rules": exactly three numbered rules, one sentence
  each, short enough to check before a flight. After each rule, in brackets,
  the legal area it comes from: airspace, registration, pilot, safety, data or
  insurance.
- Heading 1 "2. Before every flight": a real Word table with two columns,
  "Check" and "Done", six rows, one row per check.
- Heading 1 "3. If something goes wrong": four short numbered steps.
- Heading 1 "4. Who to call": two lines with blank fields, one for the teacher
  on duty and one for the school phone number.
- Body text at 11 pt, headings with the built-in Heading 1 style so the
  navigation pane works.

Acceptance: running the script creates manual.docx, opening it in Word shows the
table and the four headings, and the file is under 100 KB. Tell me the file size.`

/* ------------------------------------------------------------------ login */
const login = await fetch(`${BASE}/api/auth/login`, {
  method: 'POST', headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ username: USER, password: PASS }),
})
const cookie = (login.headers.getSetCookie?.() || []).map((c) => c.split(';')[0]).join('; ')
if (!login.ok || !cookie) { console.error('login failed', login.status); process.exit(1) }

const sql = postgres(
  process.env.PG || 'postgresql://postgres:REDACTED@10.28.1.151:5432/nuxt_lms_2026',
  { idle_timeout: 10, max: 1 },
)

/* ------------------------------------------------------------- the homework */
const HW_NAME = '📄 Your drone safety manual'
const hwContent = doc(
  p('⚖️ You are the rule maker of a new school drone club. Your job is not three lines in a text box - it is a document the club can print and pin next to the charger.'),
  p('📄 Submit ', { code: 'manual.docx' }, ' - the one OpenCode built for you above. Marked on four things: exactly three rules, each short and checkable, each tagged with its legal area, and the checklist table filled in with six real checks.'),
  p('If Word refuses to open the file, export it to PDF and submit that instead - the content is what is marked.'),
)

if (DRY) {
  console.log(`homework ${HW_CID} "${HW_NAME}" -> would be updated`)
} else {
  const res = await fetch(`${BASE}/api/homeworks/update`, {
    method: 'POST', headers: { 'Content-Type': 'application/json', Cookie: cookie },
    body: JSON.stringify({ course_id: COURSE, id: HW_CID, name: HW_NAME, content: hwContent, point: 10 }),
  })
  console.log(`~ homework cid ${HW_CID} updated: ${res.status} ${(await res.text()).slice(0, 80)}`)
}

/* ---------------------------------------------------------------- the block */
const MARK = '📄 Build the manual in Word'
const block = [
  h3(MARK),
  p('Do not type the manual by hand. Ask OpenCode to write a script that builds the Word file, then run it - you get a real ', { code: '.docx' }, ' with a table and proper headings, and you can rebuild it every time you change a rule.'),
  pre(MANUAL_PROMPT),
  p('Open the file before you submit. A rule that only exists in the chat window is not a document.'),
  callout('♻️', ['A rule is easier to change than to write. Send one more prompt - "change rule 2 so a spotter is always required" - and rebuild, instead of editing the .docx by hand.']),
]

const txt = (n) => (!n || typeof n !== 'object' ? '' : n.type === 'text' ? n.text || '' : Array.isArray(n.content) ? n.content.map(txt).join('') : '')

if (DRY) {
  console.log('\nwould insert before "Submit your homework" in Activity 2:')
  block.forEach((x) => {
    if (x.type === 'heading') console.log('  ### ' + x.content[0].text)
    else if (x.type === 'codeBlock') console.log('    [prompt, ' + x.content[0].text.split('\n').length + ' lines]')
    else console.log('    ' + (txt(x) || '').slice(0, 100))
  })
  await sql.end()
  process.exit(0)
}

/* ---------------------------------------------------------------- insert */
const show = await fetch(`${BASE}/api/chapters/show?id=${CHAPTER}`, { headers: { Cookie: cookie } })
const chapter = (await show.json()).data.chapter
const docObj = chapter.content
const nodes = docObj.content
if (!Array.isArray(nodes)) { console.error('chapter content is not a doc'); process.exit(1) }

// remove an earlier copy (up to the next heading of the same or higher level)
const start = nodes.findIndex((n) => n.type === 'heading' && txt(n).includes(MARK))
if (start >= 0) {
  let end = start + 1
  while (end < nodes.length && !(nodes[end].type === 'heading' && nodes[end].attrs.level <= 3)) end++
  nodes.splice(start, end - start)
  console.log(`removed the previous block (${end - start} nodes)`)
}

// land it just before the homework heading inside Activity 2
const a2 = nodes.findIndex((n) => n.type === 'heading' && n.attrs.level === 2 && txt(n).includes('Activity 2'))
if (a2 < 0) { console.error('Activity 2 not found'); process.exit(1) }
let insertAt = -1
for (let i = a2 + 1; i < nodes.length; i++) {
  if (nodes[i].type === 'heading' && nodes[i].attrs.level === 2) break
  if (nodes[i].type === 'heading' && txt(nodes[i]).includes('Submit your homework')) { insertAt = i; break }
}
if (insertAt < 0) { console.error('homework heading not found in Activity 2'); process.exit(1) }
nodes.splice(insertAt, 0, ...block)
console.log(`inserted ${block.length} nodes at position ${insertAt}`)

// the line above the homework now introduces a file, not a text box
const subIdx = nodes.findIndex((n) => n.type === 'paragraph' && txt(n).startsWith('✍️ Write your three safety rules'))
if (subIdx >= 0) {
  nodes[subIdx] = p('✍️ Build the manual with OpenCode, open it, then upload ', { code: 'manual.docx' }, ' below.')
  console.log('rewrote the submit line')
}

const upd = await fetch(`${BASE}/api/chapters/update`, {
  method: 'POST', headers: { 'Content-Type': 'application/json', Cookie: cookie },
  body: JSON.stringify({ id: CHAPTER, content: docObj }),
})
console.log('chapter update:', upd.status, (await upd.text()).slice(0, 140))

/* ---------------------------------------------------------------- verify */
const back = await fetch(`${BASE}/api/chapters/show?id=${CHAPTER}`, { headers: { Cookie: cookie } })
const after = (await back.json()).data.chapter.content.content
const at = after.findIndex((n) => n.type === 'heading' && txt(n).includes(MARK))
console.log(`\nchapter ${CHAPTER}: ${after.length} nodes`)
after.slice(Math.max(0, at - 3), at + 8).forEach((n, i) => {
  const tag = n.type === 'heading' ? 'h' + n.attrs.level : n.type === 'vue' ? 'vue:' + n.attrs.type : n.type
  console.log(`  ${at - 3 + i} ${tag.padEnd(12)} ${txt(n).replace(/\s+/g, ' ').slice(0, 66)}`)
})
await sql.end()
