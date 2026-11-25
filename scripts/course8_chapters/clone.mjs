/**
 * Clone entities from course 5 template chapters into course 8.
 * - cid is assigned server-side, so cloning must go through the add API
 * - dedupe by name and type, read straight from the DB
 */
import { writeFileSync } from 'node:fs'
import postgres from '/Users/oldmoon/Documents/ubuntu/nuxt_lms_2026/node_modules/postgres/src/index.js'

const BASE = 'http://10.28.1.151'
const log = (...a) => console.log(...a)

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

const sql = postgres(process.env.PG, { idle_timeout: 5, max: 1 })
const rawQuestion = async (c, cid) => (await sql`select * from questions where course_id=${c} and cid=${cid} and deleted_at is null`)[0]
const rawHomework = async (c, cid) => (await sql`select * from homeworks where course_id=${c} and cid=${cid} and deleted_at is null`)[0]
const rawComment = async (c, cid) => (await sql`select * from comments where course_id=${c} and cid=${cid} and deleted_at is null`)[0]

/* ---------------------------------------------------- source chapters */

const login = await api('/api/auth/login', 'POST', { username: 'admin', password: process.env.LMS_PASS })
TOKEN = login.token
log('✔ logged in')

const SRC = [164, 165, 166, 167]
const srcChapters = {}
for (const id of SRC) srcChapters[id] = (await api(`/api/chapters/show?id=${id}`)).chapter

function tailCids (chapter, fromActivity = 3) {
  const nodes = chapter.content.content
  const txt = (n) => {
    if (!n || typeof n !== 'object') return ''
    if (n.type === 'text') return n.text || ''
    const c = n.content
    if (Array.isArray(c)) return c.map(txt).join('')
    if (c && typeof c === 'object') return txt(c)
    return ''
  }
  const idx = []
  nodes.forEach((n, i) => {
    if (n.type === 'heading' && n.attrs?.level === 2 && /Activity \d/.test(txt(n))) idx.push(i)
  })
  const cut = idx[fromActivity - 1] ?? nodes.length
  const out = []
  const walk = (n) => {
    if (!n || typeof n !== 'object') return
    if (n.type === 'vue' && ['question', 'homework', 'comment'].includes(n.attrs?.type)) {
      out.push({ type: n.attrs.type, cid: String(n.attrs.content) })
    }
    const c = n.content
    if (Array.isArray(c)) c.forEach(walk)
    else if (c && typeof c === 'object') walk(c)
  }
  for (const n of nodes.slice(cut)) walk(n)
  const seen = new Set()
  return out.filter(r => {
    const k = r.type + ':' + r.cid
    if (seen.has(k)) return false
    seen.add(k)
    return true
  })
}

const TAIL = {}
for (const id of SRC) {
  TAIL[id] = tailCids(srcChapters[id], 3)
  log(`template ${id} ${srcChapters[id].name}: ${TAIL[id].length} tail refs → ${TAIL[id].map(r => r.type[0] + r.cid).join(' ')}`)
}

/* ------------------------------------------ existing course 8 entities */

const eQ = await sql`select cid,name,type from questions where course_id=8 and deleted_at is null`
const eH = await sql`select cid,name from homeworks where course_id=8 and deleted_at is null`
const eC = await sql`select cid,name from comments where course_id=8 and deleted_at is null`
const byQ = new Map(eQ.map(r => [`${r.type}::${r.name}`, r.cid]))
const byH = new Map(eH.map(r => [r.name, r.cid]))
const byC = new Map(eC.map(r => [r.name, r.cid]))
log(`\ncourse 8 existing: ${eQ.length} q / ${eH.length} hw / ${eC.length} c`)

/* ------------------------------------------------------------- clone */

const QMAP = new Map()
const created = { questions: [], homeworks: [], comments: [] }

for (const srcId of SRC) {
  log(`\n--- from template ${srcId} (${srcChapters[srcId].name}) ---`)
  for (const ref of TAIL[srcId]) {
    const key = `${srcId}:${ref.type}:${ref.cid}`
    if (QMAP.has(key)) continue

    if (ref.type === 'question') {
      const raw = await rawQuestion(5, ref.cid)
      if (!raw) { log(`  !! q${ref.cid} missing`); continue }
      const nk = `${raw.type}::${raw.name}`
      if (byQ.has(nk)) {
        QMAP.set(key, String(byQ.get(nk)))
        log(`  = q${ref.cid} reuse cid ${byQ.get(nk)}  ${raw.name.slice(0, 46)}`)
        continue
      }
      const row = await api('/api/questions/add', 'POST', {
        course_id: 8, name: raw.name, type: raw.type,
        content: raw.content, options: raw.options, answer: raw.answer,
        point: raw.point, difficulty: raw.difficulty, tags: raw.tags || [],
        extra: raw.extra, explanation: raw.explanation || { type: 'doc', content: [] },
      })
      const ncid = row.cid ?? row[0]?.cid
      QMAP.set(key, String(ncid)); byQ.set(nk, ncid)
      created.questions.push({ src: ref.cid, new: ncid, name: raw.name, type: raw.type })
      log(`  + q${ref.cid} → cid ${ncid}  ${raw.name.slice(0, 46)}`)
    } else if (ref.type === 'homework') {
      const raw = await rawHomework(5, ref.cid)
      if (!raw) { log(`  !! hw${ref.cid} missing`); continue }
      if (byH.has(raw.name)) {
        QMAP.set(key, String(byH.get(raw.name)))
        log(`  = hw${ref.cid} reuse cid ${byH.get(raw.name)}`)
        continue
      }
      const row = await api('/api/homeworks/add', 'POST', {
        course_id: 8, name: raw.name, content: raw.content,
        explanation: raw.explanation || { type: 'doc', content: [] },
        point: raw.point ?? 10, tags: raw.tags || [],
      })
      const ncid = row.cid ?? row[0]?.cid
      QMAP.set(key, String(ncid)); byH.set(raw.name, ncid)
      created.homeworks.push({ src: ref.cid, new: ncid, name: raw.name })
      log(`  + hw${ref.cid} → cid ${ncid}  ${raw.name.slice(0, 46)}`)
    } else if (ref.type === 'comment') {
      const raw = await rawComment(5, ref.cid)
      if (!raw) { log(`  !! c${ref.cid} missing`); continue }
      if (byC.has(raw.name)) {
        QMAP.set(key, String(byC.get(raw.name)))
        log(`  = c${ref.cid} reuse cid ${byC.get(raw.name)}`)
        continue
      }
      const row = await api('/api/comments/add', 'POST', {
        course_id: 8, name: raw.name, content: raw.content, point: raw.point ?? 5,
      })
      const ncid = row.cid ?? row[0]?.cid
      QMAP.set(key, String(ncid)); byC.set(raw.name, ncid)
      created.comments.push({ src: ref.cid, new: ncid, name: raw.name })
      log(`  + c${ref.cid} → cid ${ncid}  ${raw.name.slice(0, 46)}`)
    }
  }
}

log(`\n=== cloned: ${created.questions.length} q, ${created.homeworks.length} hw, ${created.comments.length} c`)

// verify every mapped cid exists in course 8
const bad = []
for (const [key, cid] of QMAP) {
  const [, type] = key.split(':')
  const t = type
  const r = t === 'question' ? await rawQuestion(8, Number(cid))
    : t === 'homework' ? await rawHomework(8, Number(cid))
      : await rawComment(8, Number(cid))
  if (!r) bad.push(key + ' -> ' + cid)
}
log(`verify: ${QMAP.size - bad.length}/${QMAP.size} mapped cids exist in course 8`)
if (bad.length) { log('MISSING:'); bad.forEach(b => log('  ' + b)) }

writeFileSync('/tmp/c8/cidmap.json', JSON.stringify({ QMAP: Object.fromEntries(QMAP), created, bad }, null, 2))
log('wrote /tmp/c8/cidmap.json')
await sql.end()
