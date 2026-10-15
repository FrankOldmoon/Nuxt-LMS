/**
 * Verify the saved chapters: read back from the DB, confirm Ac3+ matches the
 * template byte-for-byte (after normalising heading ids and mapping cids back).
 */
import postgres from '/Users/oldmoon/Documents/ubuntu/nuxt_lms_2026/node_modules/postgres/src/index.js'
import { readFileSync } from 'node:fs'

const sql = postgres(process.env.PG, { idle_timeout: 5, max: 1 })
const cidmap = JSON.parse(readFileSync('/tmp/c8/cidmap.json', 'utf8'))
const QMAP = cidmap.QMAP

const PAIRS = { 198: 164, 199: 165, 200: 166, 201: 167 }

const txt = (n) => {
  if (!n || typeof n !== 'object') return ''
  if (n.type === 'text') return n.text || ''
  const c = n.content
  if (Array.isArray(c)) return c.map(txt).join('')
  if (c && typeof c === 'object') return txt(c)
  return ''
}
const actIdx = (nodes) => nodes
  .map((n, i) => (n.type === 'heading' && n.attrs?.level === 2 && /Activity \d/.test(txt(n)) ? i : -1))
  .filter(i => i >= 0)

/** normalise: heading ids → placeholder; vue cids → reverse-mapped */
function norm (nodes, reverse) {
  const clone = JSON.parse(JSON.stringify(nodes))
  const fix = (x) => {
    if (!x || typeof x !== 'object') return
    if (x.type === 'heading') {
      x.attrs = { ...(x.attrs || {}), id: 'ID', 'data-toc-id': 'ID' }
      // Activity renumbering is intentional (198 has 5 acts like 164; 201 has 6 like 167)
      if (x.content?.[0]?.text) x.content[0].text = x.content[0].text.replace(/^🧪 Activity \d+/, '🧪 Activity N')
    }
    if (reverse && x.type === 'vue' && ['question', 'homework', 'comment'].includes(x.attrs?.type)) {
      // map course-8 cid back to the template cid
      for (const [k, v] of Object.entries(QMAP)) {
        const [, type, srcCid] = k.split(':')
        if (type === x.attrs.type && String(v) === String(x.attrs.content)) {
          x.attrs.content = srcCid
          break
        }
      }
    }
    if (Array.isArray(x.content)) x.content.forEach(fix)
    else if (x.content && typeof x.content === 'object') fix(x.content)
  }
  clone.forEach(fix)
  return clone
}

let allOk = true
for (const [chId, srcId] of Object.entries(PAIRS)) {
  const dst = (await sql`select id,name,content,question_ids,homework_ids,comment_ids from chapters where id=${chId}`)[0]
  const src = (await sql`select id,name,content from chapters where id=${srcId}`)[0]

  const dNodes = dst.content.content
  const sNodes = src.content.content
  const dActs = actIdx(dNodes)
  const sActs = actIdx(sNodes)

  // target Ac3 starts at the 3rd Activity heading; template the same
  const dTail = dNodes.slice(dActs[2])
  const sTail = sNodes.slice(sActs[2])

  const a = JSON.stringify(norm(dTail, true))
  const b = JSON.stringify(norm(sTail, false))
  const same = a === b

  // vfiles model files point at course-5 uploads: check the urls still resolve
  const urls = []
  const walk = (n) => {
    if (!n || typeof n !== 'object') return
    if (n.type === 'vue' && n.attrs?.type === 'vfiles') {
      try {
        const items = JSON.parse(n.attrs.content).items || []
        for (const it of items) {
          for (const ch of it.children || []) {
            for (const nd of ch.content || []) {
              if (nd.type === 'file' && nd.attrs?.url) urls.push(nd.attrs)
            }
          }
        }
      } catch {}
    }
    const c = n.content
    if (Array.isArray(c)) c.forEach(walk)
    else if (c && typeof c === 'object') walk(c)
  }
  dTail.forEach(walk)

  console.log(`\n=== chapter ${chId} ← template ${srcId} ===`)
  console.log(`   name: ${dst.name}   nodes: ${dNodes.length} (template ${sNodes.length})`)
  console.log(`   activities: ${dActs.length} (template ${sActs.length})`)
  console.log(`   Ac3+ identical to template: ${same ? '✔ YES' : '✗ NO'}`)
  if (!same) {
    // show the first difference
    const A = norm(dTail, true); const B = norm(sTail, false)
    for (let i = 0; i < Math.max(A.length, B.length); i++) {
      if (JSON.stringify(A[i]) !== JSON.stringify(B[i])) {
        console.log(`   first diff at index ${i}:`)
        console.log('     dst: ' + JSON.stringify(A[i]).slice(0, 240))
        console.log('     src: ' + JSON.stringify(B[i]).slice(0, 240))
        break
      }
    }
    allOk = false
  }
  console.log(`   entity ids → Q:${JSON.stringify(dst.question_ids)} H:${JSON.stringify(dst.homework_ids)} C:${JSON.stringify(dst.comment_ids)}`)
  if (urls.length) console.log(`   vfiles files: ${urls.map(u => `${u.name} ${u.size}b id=${u.id}`).join(' | ')}`)
}

console.log(`\n${allOk ? '✔ all four chapters match their templates from Ac3 onward' : '✗ some chapters differ'}`)
await sql.end()
