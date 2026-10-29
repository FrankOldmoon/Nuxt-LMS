/**
 * Repair the chapter-intro blockquote template that boilerplate.mjs missed:
 *   "📘 <Title>：<Title> 的核心概念与练习。"
 * Rewrites the lead sentence in English using the chapter title, keeping the
 * rest of the blockquote (the bullet list) untouched.
 *
 *   node fix-intro.mjs [--dry]
 */
import postgres from '/Users/oldmoon/Documents/ubuntu/nuxt_lms_2026/node_modules/postgres/src/index.js'

const DRY = process.argv.includes('--dry')
const COURSES = [21, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32, 33, 34, 35, 36]
const PAT = /^📘\s*(.+?)[：:]\s*\1\s*的核心概念与练习。?$/
const CJK = /[\u3400-\u4dbf\u4e00-\u9fff]/

const sql = postgres(process.env.PG, { idle_timeout: 10, max: 1 })
const rows = await sql`select id, course_id, name, content from chapters where course_id in ${sql(COURSES)} order by id`

let fixed = 0
for (const r of rows) {
  const nodes = r.content?.content
  if (!Array.isArray(nodes) || !nodes.length) continue
  const bq = nodes[0]
  if (bq.type !== 'blockquote') continue
  const first = bq.content?.[0]
  const t0 = first?.content?.[0]
  if (!t0 || t0.type !== 'text') continue
  const m = PAT.exec(t0.text.trim())
  if (!m) continue
  t0.text = `📘 ${r.name}: the core ideas of this chapter, then practice with them.`
  console.log(`  ${String(r.id).padStart(4)} ${r.name}: intro rewritten`)
  if (!DRY) await sql`update chapters set content=${sql.json(r.content)} where id=${r.id}`
  fixed++
}
console.log(`\nintro templates fixed: ${fixed}${DRY ? '  (dry)' : ''}`)
await sql.end()
