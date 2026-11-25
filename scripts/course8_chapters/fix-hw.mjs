/**
 * Fix: template 167 uses two different homeworks that share the name "P2-H2"
 * (cid 5 = AI for Excel, cid 2 = create PPT), so name-dedupe merged them into one
 * row — and that row inherited the broken "[object Object]" content from
 * course 5's cid 5. Give each its own row with correct content, then repoint
 * chapter 201's two homework nodes.
 */
import postgres from '/Users/oldmoon/Documents/ubuntu/nuxt_lms_2026/node_modules/postgres/src/index.js'

const BASE = 'http://10.28.1.151'
let TOKEN = ''
async function api (p, method = 'GET', body) {
  const r = await fetch(BASE + p, {
    method,
    headers: { 'Content-Type': 'application/json', ...(TOKEN ? { Cookie: `auth_token=${TOKEN}` } : {}) },
    body: body === undefined ? undefined : JSON.stringify(body),
  })
  const d = await r.json().catch(() => ({}))
  if (!d.success) throw new Error(`${method} ${p}: ${d.msg || r.status}`)
  return d.data
}
const log = (...a) => console.log(...a)
const sql = postgres(process.env.PG, { idle_timeout: 5, max: 1 })

const PA = { indent: null, margin: null, wordWrap: 'normal', textAlign: null, indentUnit: null, lineHeight: 1.75 }
const docOf = (paras) => ({
  type: 'doc',
  content: paras.map(text => ({
    type: 'paragraph',
    attrs: { ...PA },
    content: [{ type: 'text', text }],
  })),
})

TOKEN = (await api('/api/auth/login', 'POST', { username: 'admin', password: process.env.LMS_PASS })).token
log('✔ logged in')

/* ---------------- 1. repair the merged homework (course 8 cid 5) --------- */
// cid 5 came from template cid 2 (create PPT) by name, but its stored content is
// the broken "[object Object]". Give it the correct PPT content.
const hw5 = (await sql`select * from homeworks where course_id=8 and cid=5`)[0]
log(`current course8 hw5: name=${hw5.name} content=${JSON.stringify(String(hw5.content)).slice(0, 60)}`)

await sql`update homeworks set content=${sql.json('📋 Prepare and submit your ppt for your STEAM project')} where course_id=8 and cid=5`
log('✔ hw5 (create PPT) content repaired')

/* ------------- 2. create a separate homework for AI for Excel ------------ */
const EXCEL_NAME = '📊 Excel table of CV libraries'
let excel = (await sql`select cid from homeworks where course_id=8 and name=${EXCEL_NAME} and deleted_at is null`)[0]
if (excel) {
  log(`= excel homework already exists: cid ${excel.cid}`)
} else {
  const row = await api('/api/homeworks/add', 'POST', {
    course_id: 8,
    name: EXCEL_NAME,
    content: docOf([
      '📊 Turn the CV library statistics from the poster into an Excel table with charts.',
      '🤖 Ask the AI to build the table and the charts for you, then check every number against the poster.',
      '📤 Upload your Excel file below. ✅ The file must open in Excel and contain at least one chart.',
    ]),
    explanation: { type: 'doc', content: [] },
    point: 10,
    tags: [],
  })
  excel = { cid: row.cid ?? row[0]?.cid }
  log(`+ excel homework created: cid ${excel.cid}`)
}

/* ------------- 3. repoint chapter 201: Ac4 → excel, Ac5 → PPT ------------- */
const ch = (await sql`select content from chapters where id=201`)[0]
const doc = ch.content
const nodes = doc.content
const txt = (n) => {
  if (!n || typeof n !== 'object') return ''
  if (n.type === 'text') return n.text || ''
  const c = n.content
  if (Array.isArray(c)) return c.map(txt).join('')
  if (c && typeof c === 'object') return txt(c)
  return ''
}
// find the two homework vue nodes in document order
const hwNodes = []
const walk = (n) => {
  if (!n || typeof n !== 'object') return
  if (n.type === 'vue' && n.attrs?.type === 'homework') hwNodes.push(n)
  const c = n.content
  if (Array.isArray(c)) c.forEach(walk)
  else if (c && typeof c === 'object') walk(c)
}
walk(doc)
log(`\nchapter 201 homework nodes in order: ${hwNodes.map(n => n.attrs.content).join(', ')}`)
// Ac1 homework (own) is first; then Ac4 excel; then Ac5 ppt
if (hwNodes.length === 3) {
  hwNodes[1].attrs.content = String(excel.cid)
  hwNodes[2].attrs.content = '5'
  log(`✔ repointed: Ac1=${hwNodes[0].attrs.content} Ac4=${hwNodes[1].attrs.content} Ac5=${hwNodes[2].attrs.content}`)
} else {
  log(`!! expected 3 homework nodes, found ${hwNodes.length}`)
}

// report which Activity each belongs to, for the record
let cur = ''
for (const n of nodes) {
  if (n.type === 'heading' && n.attrs?.level === 2) cur = txt(n)
  if (n.type === 'vue' && n.attrs?.type === 'homework') log(`     homework cid ${n.attrs.content}  under: ${cur}`)
}

await api('/api/chapters/update', 'POST', { id: 201, content: doc })
log('\n✔ chapter 201 saved')

const after = (await sql`select content,homework_ids from chapters where id=201`)[0]
log(`read-back homework_ids: ${JSON.stringify(after.homework_ids)}`)
await sql.end()
