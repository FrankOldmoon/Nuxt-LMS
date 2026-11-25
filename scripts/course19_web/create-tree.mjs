/**
 * Create the full chapter tree for course 19 (Web Coding) and wire orders.
 * Idempotent: skips chapters that already exist by name.
 */
import { writeFileSync } from 'node:fs'

const BASE = 'http://10.28.1.151'
const COURSE_ID = 19
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

/* The curriculum: unit groups, each with child chapters. */
const TREE = [
  {
    group: 'Getting Started',
    children: [
      { name: 'Web Basic', existingId: 1099 },
      { name: 'Text, Lists and Links' },
      { name: 'Images and Layout' },
    ],
  },
  {
    group: 'CSS Styling',
    children: [
      { name: 'Colours, Fonts and Text' },
      { name: 'The Box Model and Flexbox' },
    ],
  },
  {
    group: 'JavaScript Basics',
    children: [
      { name: 'Variables and Decisions' },
      { name: 'Loops and Arrays' },
    ],
  },
  {
    group: 'Interactive Web',
    children: [
      { name: 'Functions and the DOM' },
      { name: 'Event Handlers' },
    ],
  },
  {
    group: 'Projects',
    children: [
      { name: 'Project: Quiz App' },
      { name: 'Project: Todo List' },
    ],
  },
]

const login = await api('/api/auth/login', 'POST', { username: 'admin', password: process.env.LMS_PASS })
TOKEN = login.token
console.log('✔ logged in')

const course = await api(`/api/courses/show?id=${COURSE_ID}`)

// existing chapter names in this course (for idempotency)
const existingNames = new Map()
for (const c of course.chapters || []) if (c.title) existingNames.set(c.title, String(c.id))
console.log('existing chapters:', [...existingNames.entries()].map(([k, v]) => `${k}=${v}`).join(', ') || '(none)')

const created = []
const reused = []

async function ensureChapter (name) {
  if (existingNames.has(name)) {
    reused.push({ name, id: existingNames.get(name) })
    return existingNames.get(name)
  }
  const row = await api('/api/chapters/add', 'POST', { name, courseId: COURSE_ID, isOpen: true })
  const id = String(row[0].id)
  existingNames.set(name, id)
  created.push({ name, id })
  console.log(`  + ${name} → ${id}`)
  return id
}

console.log('\ncreating chapters:')
const orders = []
for (const [u, unit] of TREE.entries()) {
  const gid = await ensureChapter(unit.group)
  orders.push({ id: gid, label: unit.group, parentId: null, order: u })
  for (const [i, ch] of unit.children.entries()) {
    const cid = await ensureChapter(ch.name)
    orders.push({ id: cid, label: ch.name, parentId: gid, order: i })
  }
}

await api('/api/courses/update', 'POST', { id: COURSE_ID, orders })
console.log(`\n✔ orders written: ${orders.length} entries`)
console.log(`  created ${created.length}, reused ${reused.length}`)

// verify
const after = await api(`/api/courses/show?id=${COURSE_ID}`)
console.log('\n── verified tree ──')
const byParent = new Map()
for (const o of after.orders) {
  if (o.parentId == null) byParent.set(String(o.id), [])
}
for (const o of after.orders) {
  if (o.parentId != null && byParent.has(String(o.parentId))) byParent.get(String(o.parentId)).push(o)
}
for (const o of after.orders.filter(x => x.parentId == null).sort((a, b) => a.order - b.order)) {
  console.log(`${o.order + 1}. ${o.label} (${o.id})`)
  for (const c of (byParent.get(String(o.id)) || []).sort((a, b) => a.order - b.order)) {
    console.log(`   ${o.order + 1}.${c.order + 1} ${c.label} (${c.id})`)
  }
}
console.log('\ntotal chapters in course:', (after.chapters || []).length)

fsDump({ created, reused, orders })
function fsDump () {
  writeFileSync('/tmp/c19/ids.json', JSON.stringify({ created, reused, orders }, null, 2))
}
