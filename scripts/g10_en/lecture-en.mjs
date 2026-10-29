/**
 * Step 2 of the G10-G12 English pass: replace the Chinese lecture block of a
 * chapter with English prose.
 *
 * The lecture block is the run of `###` sections that starts with 🔍 and ends
 * just before the first original concept heading (💡 / 🧪 / 📐 / 💻 / ⚠️ …).
 * Whatever is in that slice gets deleted and rebuilt from the JSON input, so
 * running the same file twice is harmless.
 *
 *   node lecture-en.mjs en-21-1.json --dry
 *   node lecture-en.mjs en-21-1.json
 *
 * Input shape:
 *   { "560": { "sections": [ { "title": "🔍 …", "paras": ["…"], "bullets": ["…"] } ] } }
 */
import { readFileSync } from 'node:fs'
import postgres from '/Users/oldmoon/Documents/ubuntu/nuxt_lms_2026/node_modules/postgres/src/index.js'

const FILE = process.argv[2]
const DRY = process.argv.includes('--dry')
if (!FILE) { console.error('usage: node lecture-en.mjs <json> [--dry]'); process.exit(1) }

const PA = { indent: null, margin: null, wordWrap: 'normal', textAlign: null, indentUnit: null, lineHeight: 1.75 }
let seq = 0
const nid = () => 'en' + (seq++).toString(36) + Math.random().toString(36).slice(2, 5)
const t = (text, marks) => ({ type: 'text', text, ...(marks ? { marks } : {}) })
const p = (text) => ({ type: 'paragraph', attrs: { ...PA }, content: [t(text)] })
const h3 = (text) => {
  const id = nid()
  return { type: 'heading', attrs: { id, level: 3, ...PA, 'data-toc-id': id }, content: [t(text, [{ type: 'bold' }])] }
}
const ul = (items) => ({
  type: 'bulletList', attrs: { type: null, margin: null, listType: 'disc' },
  content: items.map((s) => ({ type: 'listItem', attrs: { indent: null, indentUnit: null }, content: [p(s)] })),
})
const codeBlock = (code, lang = 'python') => ({ type: 'codeBlock', attrs: { language: lang }, content: [t(code)] })

const txt = (n) => {
  if (!n || typeof n !== 'object') return ''
  if (n.type === 'text') return n.text || ''
  const c = n.content
  return Array.isArray(c) ? c.map(txt).join('') : ''
}
const CJK = /[\u3400-\u4dbf\u4e00-\u9fff]/g
const LECTURE = /^\s*(🔍|⚙️|🧮)/

const data = JSON.parse(readFileSync(FILE, 'utf8'))
const ids = Object.keys(data).map(Number)
const sql = postgres(process.env.PG, { idle_timeout: 10, max: 1 })
const rows = await sql`select id, name, content from chapters where id in ${sql(ids)} order by id`

let done = 0, skipped = 0, inserted = 0, stillChinese = 0
for (const r of rows) {
  const spec = data[String(r.id)]
  if (!spec?.sections?.length) continue
  const nodes = r.content?.content
  if (!Array.isArray(nodes)) { skipped++; continue }

  // locate Activity 1
  const act = nodes.findIndex((n) => n.type === 'heading' && n.attrs?.level === 2 && /Activity 1\b/.test(txt(n)))
  if (act < 0) { skipped++; continue }

  // start = first lecture heading after Activity 1
  const start = nodes.findIndex((n, i) => i > act && n.type === 'heading' && LECTURE.test(txt(n)))
  // end = first heading after start that is not part of the lecture
  let end = -1
  if (start >= 0) {
    for (let i = start + 1; i < nodes.length; i++) {
      const n = nodes[i]
      if (n.type === 'heading' && !LECTURE.test(txt(n))) { end = i; break }
    }
  }

  const block = []
  for (const sec of spec.sections) {
    block.push(h3(sec.title))
    for (const para of sec.paras || []) block.push(p(para))
    if (sec.bullets?.length) block.push(ul(sec.bullets))
    if (sec.code) block.push(codeBlock(sec.code, sec.lang || 'python'))
  }

  if (start >= 0 && end > start) {
    nodes.splice(start, end - start, ...block)
  } else if (start >= 0) {
    nodes.splice(start, nodes.length - start, ...block)
  } else {
    // no lecture yet: drop it right after the Activity 1 intro blockquote
    let at = act + 1
    if (nodes[at]?.type === 'blockquote') at++
    nodes.splice(at, 0, ...block)
    inserted++
  }

  // keep every heading valid
  for (const n of nodes) {
    if (n.type === 'heading' && n.attrs) {
      if (!n.attrs.id) n.attrs.id = nid()
      n.attrs['data-toc-id'] = n.attrs.id
      if (!n.content?.[0]?.marks?.length) n.content[0].marks = [{ type: 'bold' }]
    }
  }

  const left = (txt(r.content).match(CJK) || []).length
  if (left) stillChinese++
  const chars = block.reduce((s, n) => s + txt(n).length, 0)
  console.log(`  ${String(r.id).padStart(4)} ${String(r.name).slice(0, 38).padEnd(40)} +${block.length} nodes, ${chars} chars, cjk left: ${left}`)

  if (!DRY) await sql`update chapters set content=${sql.json(r.content)} where id=${r.id}`
  done++
}

console.log(`\nrewritten: ${done} | skipped: ${skipped} | had no lecture: ${inserted} | chapters still holding CJK: ${stillChinese}${DRY ? '  (dry)' : ''}`)
await sql.end()
