/**
 * Validate the built chapters with the skills/03 self-check, then save them.
 * Usage: node validate-save.mjs [--dry]
 */
import { readFileSync } from 'node:fs'
import postgres from '/Users/oldmoon/Documents/ubuntu/nuxt_lms_2026/node_modules/postgres/src/index.js'

const BASE = 'http://10.28.1.151'
const DRY = process.argv.includes('--dry')
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

/* ------------------------------------------- skills/03 self-check */

function validateContent (node, issues = []) {
  if (!node || typeof node !== 'object') return issues
  if (node.type === 'text') {
    if (typeof node.text !== 'string') issues.push('① text.text is not a string')
    if (node.marks !== undefined && !Array.isArray(node.marks)) issues.push('④ marks is not an array')
  }
  if (node.type === 'heading') {
    const t = node.content?.[0]?.text || ''
    if (!node.attrs?.id) issues.push('② heading missing id: ' + t)
    if (node.attrs?.id !== node.attrs?.['data-toc-id']) issues.push('② id !== data-toc-id: ' + t)
    if (!(node.content?.[0]?.marks || []).some(m => m.type === 'bold')) issues.push('⑦ heading missing bold: ' + t)
    if (!(/\p{Extended_Pictographic}/u.test(t) || /⃣/u.test(t))) issues.push('⑧ heading missing emoji: ' + t)
  }
  if (node.type === 'codeBlock' && !node.attrs?.language) issues.push('③ codeBlock missing language')
  if (Array.isArray(node.content)) node.content.forEach(n => validateContent(n, issues))
  else if (node.content && typeof node.content === 'object') validateContent(node.content, issues)
  return issues
}

function validateChapterLayout (content) {
  const issues = []
  const nodes = content?.content || []
  const txt = (n) => (!n || typeof n !== 'object') ? '' : n.type === 'text' ? (n.text || '') : Array.isArray(n.content) ? n.content.map(txt).join('') : typeof n.content === 'object' ? txt(n.content) : ''
  const first = nodes[0]
  if (!first || first.type !== 'blockquote') issues.push('⑪ doc does not start with the chapter-intro blockquote')
  else {
    const k = (first.content || []).map(c => c.type)
    if (k[0] !== 'paragraph') issues.push('⑪ intro blockquote first child is not an overview paragraph')
    if (k[1] !== 'orderedList') issues.push('⑪ intro blockquote has no orderedList')
    else if ((first.content[1].content || []).length < 2) issues.push('⑪ intro orderedList needs >=2 items')
  }
  if (!(nodes[1] && nodes[1].type === 'heading' && /Learning Objectives/.test(txt(nodes[1])))) issues.push('⑪ intro is not immediately followed by Learning Objectives')
  for (let i = 0; i < nodes.length; i++) {
    const n = nodes[i]
    if (!(n.type === 'heading' && n.attrs?.level === 2 && /Activity \d/.test(txt(n)))) continue
    const a = nodes[i + 1]
    const kids = a && a.type === 'blockquote' ? (a.content || []) : []
    if (a?.type !== 'blockquote') issues.push('⑨ Activity has no intro blockquote: ' + txt(n))
    else if (kids[0]?.type !== 'paragraph') issues.push('⑨ intro blockquote first child is not a paragraph: ' + txt(n))
    else if (kids[1]?.type !== 'orderedList') issues.push('⑨ intro blockquote has no orderedList: ' + txt(n))
    else if ((kids[1].content || []).length < 2) issues.push('⑨ orderedList needs >=2 items: ' + txt(n))
    if (a && (a.type === 'orderedList' || nodes[i + 2]?.type === 'orderedList')) issues.push('⑨ intro blockquote and list must not be siblings: ' + txt(n))
  }
  const last = nodes[nodes.length - 1]
  if (last && last.type === 'paragraph' && !txt(last).trim()) issues.push('⑩ trailing empty paragraph')
  return issues
}

/** nested-array scan (skill §3.1) */
function countNested (node, bad = { n: 0 }) {
  if (!node || typeof node !== 'object') return bad.n
  if (Array.isArray(node.content)) {
    if (node.content.some(c => Array.isArray(c))) bad.n++
    node.content.forEach(c => countNested(c, bad))
  } else if (node.content && typeof node.content === 'object') countNested(node.content, bad)
  return bad.n
}

const headingIds = (content) => {
  const ids = []
  const walk = (n) => {
    if (!n || typeof n !== 'object') return
    if (n.type === 'heading' && n.attrs?.id) ids.push(n.attrs.id)
    const c = n.content
    if (Array.isArray(c)) c.forEach(walk)
    else if (c && typeof c === 'object') walk(c)
  }
  walk(content)
  return ids
}

/* --------------------------------------------------------------- run */

const built = JSON.parse(readFileSync('/tmp/c8/built.json', 'utf8'))
const sql = postgres(process.env.PG, { idle_timeout: 5, max: 1 })

// rule ⑩: drop trailing empty paragraphs inherited from the template
for (const b of built) {
  while (b.doc.length) {
    const last = b.doc[b.doc.length - 1]
    const isEmptyPara = last.type === 'paragraph' &&
      (last.content || []).every(c => c.type !== 'text' || !(c.text || '').trim())
    if (!isEmptyPara) break
    b.doc.pop()
  }
}

TOKEN = (await api('/api/auth/login', 'POST', { username: 'admin', password: 'REDACTED' })).token
log('✔ logged in\n')

let total = 0
for (const { chId, srcId, doc } of built) {
  const content = { type: 'doc', content: doc }
  const issues = [...validateChapterLayout(content), ...validateContent(content)]
  const nested = countNested(content)
  const ids = headingIds(content)
  const dupes = ids.filter((v, i) => ids.indexOf(v) !== i)

  // entity refs
  const refs = { question: [], homework: [], comment: [] }
  const walk = (n) => {
    if (!n || typeof n !== 'object') return
    if (n.type === 'vue' && refs[n.attrs?.type]) refs[n.attrs.type].push(n.attrs.content)
    const c = n.content
    if (Array.isArray(c)) c.forEach(walk)
    else if (c && typeof c === 'object') walk(c)
  }
  walk(content)

  const missing = []
  for (const q of refs.question) if (!(await sql`select 1 from questions where course_id=8 and cid=${q} and deleted_at is null`)[0]) missing.push('q' + q)
  for (const h of refs.homework) if (!(await sql`select 1 from homeworks where course_id=8 and cid=${h} and deleted_at is null`)[0]) missing.push('h' + h)
  for (const c of refs.comment) if (!(await sql`select 1 from comments where course_id=8 and cid=${c} and deleted_at is null`)[0]) missing.push('c' + c)

  const acts = doc.filter(n => n.type === 'heading' && n.attrs?.level === 2 && /Activity \d/.test((n.content || []).map(x => x.text || '').join('')))
  const introPts = ((doc[0].content || [])[1].content || []).length
  const objs = (() => {
    const i = doc.findIndex(n => n.type === 'heading' && /Learning Objectives/.test((n.content || []).map(x => x.text || '').join('')))
    const ol = doc[i + 1]
    return ol && ol.type === 'orderedList' ? ol.content.length : 0
  })()

  log(`── chapter ${chId} (from template ${srcId}) ──`)
  log(`   nodes=${doc.length} activities=${acts.length} introPoints=${introPts} objectives=${objs}`)
  log(`   Q=${refs.question.length} H=${refs.homework.length} C=${refs.comment.length} | missing=${missing.length ? missing.join(',') : 'none'}`)
  log(`   nestedArrays=${nested} duplicateHeadingIds=${dupes.length ? dupes.join(',') : 'none'}`)
  log(`   issues: ${issues.length ? issues.length + ' → ' + issues.slice(0, 6).join(' | ') : '✔ 0'}`)

  if (issues.length || nested || dupes.length || missing.length) total++
  else if (!DRY) {
    await api('/api/chapters/update', 'POST', { id: Number(chId), content })
    log(`   ✔ saved`)
  }
}

log(`\n${DRY ? 'dry run — nothing written' : 'saved'}: ${total} chapter(s) with problems`)
await sql.end()
