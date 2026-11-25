/**
 * Save every course-19 chapter from the unit modules, then add bold marks to
 * headings and run the skills/03 self-check across the whole course.
 */
import { readFileSync, writeFileSync } from 'node:fs'
import u1 from './unit1.mjs'
import u2 from './unit2.mjs'
import u3 from './unit3.mjs'
import u4 from './unit4.mjs'
import u5 from './unit5.mjs'

const BASE = 'http://10.28.1.151'
const COURSE_ID = 19
const DRY = process.argv.includes('--dry')

const CHAPTERS = { ...u1, ...u2, ...u3, ...u4, ...u5 }

let TOKEN = ''
async function api (p, method = 'GET', body) {
  const res = await fetch(BASE + p, {
    method,
    headers: { 'Content-Type': 'application/json', ...(TOKEN ? { Cookie: `auth_token=${TOKEN}` } : {}) },
    body: body === undefined ? undefined : JSON.stringify(body),
  })
  const data = await res.json().catch(() => ({}))
  if (!data.success) throw new Error(`${method} ${p}: ${data.msg || res.status}`)
  return data.data
}

/* ------------------------------------------------ skills/03 self-check */

function validateContent (node, issues = []) {
  if (!node || typeof node !== 'object') return issues
  if (node.type === 'text') {
    if (typeof node.text !== 'string') issues.push('① text.text is not a string')
    if (node.marks !== undefined && !Array.isArray(node.marks)) issues.push('④ marks is not an array')
  }
  if (node.type === 'heading') {
    const t = node.content?.[0]?.text || ''
    if (!node.attrs?.id) issues.push('② heading missing id: ' + t)
    if (node.attrs?.id !== node.attrs?.['data-toc-id']) issues.push('② heading id !== data-toc-id: ' + t)
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
    if (k[0] !== 'paragraph') issues.push('⑪ chapter-intro blockquote first child is not an overview paragraph')
    if (k[1] !== 'orderedList') issues.push('⑪ chapter-intro blockquote has no orderedList of chapter points')
    else if ((first.content[1].content || []).length < 2) issues.push('⑪ chapter-intro orderedList needs >=2 items')
  }
  if (!(nodes[1] && nodes[1].type === 'heading' && /Learning Objectives/.test(txt(nodes[1])))) issues.push('⑪ chapter-intro is not immediately followed by Learning Objectives')
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

/* ------------------------------------------------------------ bold pass */

function boldHeadings (node, stats = { fixed: 0, total: 0 }) {
  if (!node || typeof node !== 'object') return stats
  if (node.type === 'heading') {
    for (const t of node.content || []) {
      if (t.type !== 'text') continue
      stats.total++
      const marks = Array.isArray(t.marks) ? t.marks : []
      if (!marks.some(m => m.type === 'bold')) {
        t.marks = [...marks, { type: 'bold' }]
        stats.fixed++
      }
    }
  }
  if (Array.isArray(node.content)) node.content.forEach(n => boldHeadings(n, stats))
  else if (node.content && typeof node.content === 'object') boldHeadings(node.content, stats)
  return stats
}

/* ------------------------------------------------------------------ run */

const HERE = new URL('.', import.meta.url).pathname
const ids = JSON.parse(readFileSync(HERE + 'ids.json', 'utf8'))
const allIds = [...ids.created.map(c => c.id), ...ids.reused.map(c => c.id)]

const login = await api('/api/auth/login', 'POST', { username: 'admin', password: process.env.LMS_PASS })
TOKEN = login.token
console.log('✔ logged in')

// 1. save markdown for every chapter we have content for
if (!DRY) {
  for (const [id, md] of Object.entries(CHAPTERS)) {
    await api('/api/chapters/update', 'POST', { id: Number(id), content: md })
    console.log(`  saved chapter ${id} (${md.length} bytes)`)
  }
  // 2. re-read, add bold, save back
  for (const id of Object.keys(CHAPTERS)) {
    const ch = await api(`/api/chapters/show?id=${id}`)
    const s = boldHeadings(ch.chapter.content)
    await api('/api/chapters/update', 'POST', { id: Number(id), content: ch.chapter.content })
    console.log(`  bold ${id}: ${s.fixed}/${s.total}`)
  }
} else {
  console.log('· dry run, nothing written')
}

// 3. verify everything
const course = await api(`/api/courses/show?id=${COURSE_ID}`)
const byId = new Map((course.chapters || []).map(c => [String(c.id), c.title]))
let totalIssues = 0
let totalIframes = 0
const report = []

for (const id of allIds) {
  const ch = await api(`/api/chapters/show?id=${id}`)
  const doc = ch.chapter.content
  const nodes = doc?.content || []
  const issues = [...validateChapterLayout(doc), ...validateContent(doc)]
  const iframes = nodes.filter(n => n.type === 'iframe')
  totalIframes += iframes.length
  totalIssues += issues.length
  const h2 = nodes.filter(n => n.type === 'heading' && n.attrs?.level === 2)
  const acts = h2.filter(n => /Activity \d/.test((n.content?.[0]?.text) || ''))
  report.push({ id, title: byId.get(String(id)) || '?', nodes: nodes.length, h2: h2.length, acts: acts.length, iframes: iframes.length, issues: issues.length })
  if (issues.length) issues.forEach(i => console.log(`   ✗ [${id}] ${i}`))
}

console.log('\n── course 19 content report ──')
console.log('id    nodes  h2  acts  iframes  issues  title')
for (const r of report.sort((a, b) => Number(a.id) - Number(b.id))) {
  console.log(
    String(r.id).padEnd(6) + String(r.nodes).padEnd(7) + String(r.h2).padEnd(4) +
    String(r.acts).padEnd(6) + String(r.iframes).padEnd(9) + String(r.issues).padEnd(8) + r.title
  )
}
console.log(`\ntotal: ${report.length} chapters, ${totalIframes} web maker embeds, ${totalIssues} issues`)
writeFileSync(HERE + 'report.json', JSON.stringify(report, null, 2))
