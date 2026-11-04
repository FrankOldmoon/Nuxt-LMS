/**
 * Rewrite one list item inside the Activity 4 intro blockquote, without
 * touching the other items (the teacher edits those by hand).
 *
 * Why a separate script: patch_chapter.mjs replaces whole nodes, and rebuilding
 * this blockquote would overwrite the two items nobody asked to change.
 *
 *   node sync_step.mjs --diff
 *   node sync_step.mjs
 */
import postgres from '/Users/oldmoon/Documents/ubuntu/nuxt_lms_2026/node_modules/postgres/src/index.js'

const BASE = process.env.LMS || 'http://10.28.1.151'
const USER = process.env.LMS_USER || 'admin'
if (!process.env.LMS_PASS) throw new Error('请设置 LMS_PASS 环境变量（LMS 管理员密码）')
const PASS = process.env.LMS_PASS
const DRY = process.argv.includes('--diff')

const PA = { indent: null, margin: null, wordWrap: 'normal', textAlign: null, indentUnit: null, lineHeight: 1.75 }
const t = (text, marks) => ({ type: 'text', text, ...(marks ? { marks } : {}) })
const seg = (s) => (typeof s === 'string' ? t(s) : s.code !== undefined ? t(s.code, [{ type: 'code' }]) : t(s.bold, [{ type: 'bold' }]))
const p = (...segs) => ({ type: 'paragraph', attrs: { ...PA }, content: segs.map(seg) })
const txt = (n) => (!n || typeof n !== 'object' ? '' : n.type === 'text' ? n.text || '' : Array.isArray(n.content) ? n.content.map(txt).join('') : '')

const NEW_ITEM = p(
  'Save ', { code: 'main.py' }, ' and ', { code: 'ssd1306.py' },
  ' to the board, in the same folder, then run ', { code: 'main.py' }, '. ',
  { code: 'ang.json' }, ' is written on the first run if it is missing.',
)

const sql = postgres(process.env.PG, { idle_timeout: 10, max: 1 })
const row = (await sql`select content from chapters where id = 217`)[0]
const doc = row.content
const nodes = doc.content

const bq = nodes.find((n) => n.type === 'blockquote' && txt(n).startsWith('🎤 One program'))
if (!bq) throw new Error('Activity 4 intro blockquote not found')
const list = bq.content.find((n) => n.type === 'orderedList' || n.type === 'bulletList')
if (!list) throw new Error('no step list in that blockquote')

const before = list.content.map((it) => txt(it))
const target = list.content.findIndex((it) => /^Save\s+main\.py/.test(txt(it)))
if (target < 0) throw new Error('no "Save main.py" step found: ' + JSON.stringify(before))
list.content[target].content = [NEW_ITEM]

const after = list.content.map((it) => txt(it))
console.log('blockquote steps:')
before.forEach((s, i) => {
  const changed = s !== after[i]
  console.log(`  ${changed ? '~' : ' '} ${i + 1}. ${s.slice(0, 78)}`)
  if (changed) console.log(`       -> ${after[i].slice(0, 78)}`)
})
const othersSame = before.every((s, i) => i === target || s === after[i])
console.log(`\nother steps untouched: ${othersSame} | nodes: ${nodes.length}`)
if (!othersSame) {
  console.error('refusing to upload: another step would change')
  process.exit(1)
}

doc.content = nodes
await sql.end()

if (DRY) {
  console.log('\n--diff: nothing sent')
  process.exit(0)
}

const login = await fetch(`${BASE}/api/auth/login`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ username: USER, password: PASS }),
})
const cookie = (login.headers.getSetCookie?.() || []).map((c) => c.split(';')[0]).join('; ')
if (!login.ok || !cookie) {
  console.error('login failed:', login.status)
  process.exit(1)
}
const res = await fetch(`${BASE}/api/chapters/update`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json', Cookie: cookie },
  body: JSON.stringify({ id: 217, content: doc }),
})
console.log('update:', res.status, (await res.text()).slice(0, 120))
