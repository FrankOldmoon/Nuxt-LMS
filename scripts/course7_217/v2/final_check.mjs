/**
 * One-shot audit of chapter 217 (course 7) after the file-layout conversion.
 *
 * Checks, in order:
 *   1. shape of the chapter (nodes, vfiles blocks, who touched it last)
 *   2. every file served by a vfiles block matches the copy in scripts/course7_217/v2
 *   3. the ang.json handling block is byte-identical across the four programs
 *   4. stale wording that would contradict the new layout
 *   5. the WiFi setup steps added in the admin UI are still there
 *   6. structural sanity (heading ids, bold, tables, lists under Activity)
 *
 *   node final_check.mjs
 */
import { readFileSync, readdirSync } from 'node:fs'
import postgres from '/Users/oldmoon/Documents/ubuntu/nuxt_lms_2026/node_modules/postgres/src/index.js'

const DIR = '/Users/oldmoon/Documents/ubuntu/nuxt_lms_2026/scripts/course7_217/v2'
const EXPECT = {
  'standing pose only': ['stand', ['ang.json', 'main.py']],
  'Program 2: WiFi remote': ['wifi', ['ang.json', 'control.html', 'main.py']],
  'Program 3: dance show': ['dance', ['ang.json', 'main.py']],
  'Program 4: talk to it': ['ai', ['ang.json', 'main.py', 'ssd1306.py']],
}

const sql = postgres(process.env.PG, { idle_timeout: 10, max: 1 })
const row = (await sql`select id, name, updated_at, content from chapters where id = 217`)[0]
const nodes = row.content.content
const txt = (n) => (!n || typeof n !== 'object' ? '' : n.type === 'text' ? n.text || '' : Array.isArray(n.content) ? n.content.map(txt).join('') : '')

const results = []
const check = (name, ok, detail = '') => {
  results.push({ name, ok, detail })
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? '  - ' + detail : ''}`)
}
const warn = (name, detail) => console.log(`WARN  ${name}  - ${detail}`)

/* ---------------------------------------------------------------- 1 shape */
console.log('\n=== 1. chapter shape ===')
const vf = nodes.filter((n) => n.type === 'vue' && n.attrs?.type === 'vfiles')
console.log(`nodes: ${nodes.length} | vfiles blocks: ${vf.length} | updated: ${row.updated_at.toISOString()}`)
check('four file blocks', vf.length === 4, `${vf.length} found`)

/* ------------------------------------------------- 2 files vs local source */
console.log('\n=== 2. files in the chapter vs scripts/course7_217/v2 ===')
for (const [marker, [folder, labels]] of Object.entries(EXPECT)) {
  const block = vf.find((n) => n.attrs.content.includes(marker))
  check(`block exists: ${marker}`, !!block)
  if (!block) continue
  const files = JSON.parse(block.attrs.content).items[0].children
  const got = files.map((f) => f.label)
  check(`  ${folder}: file list`, JSON.stringify(got) === JSON.stringify(labels), got.join(' + '))
  for (const f of files) {
    const body = f.content.replace(/^```[a-z]*\n/, '').replace(/\n```$/, '') + '\n'
    // ang.json lives once, at the root of v2/ - every program shares it
    const local = f.label === 'ang.json' ? `${DIR}/ang.json` : `${DIR}/${folder}/${f.label}`
    let disk
    try {
      disk = readFileSync(local, 'utf8')
    } catch {
      disk = null
    }
    const same = disk !== null && body === disk
    check(`  ${folder}/${f.label} identical to disk`, same, same ? `${body.length} B` : `${body.length} B vs ${disk ? disk.length : 'missing'} B`)
  }
}

/* ------------------------------------------------ 3 shared ang.json block */
console.log('\n=== 3. ang.json handling is the same in all four programs ===')
const FROM = 'ANG_FILE = "ang.json"'
const TO = 'print("ANG =", ANG)'
const shared = []
for (const [marker, [folder]] of Object.entries(EXPECT)) {
  const block = vf.find((n) => n.attrs.content.includes(marker))
  const f = JSON.parse(block.attrs.content).items[0].children.find((x) => x.label === 'main.py')
  const body = f.content.replace(/^```[a-z]*\n/, '').replace(/\n```$/, '')
  const a = body.indexOf(FROM)
  const b = body.indexOf(TO)
  shared.push({ folder, block: body.slice(a, b + TO.length), body })
}
const allSame = shared.every((s) => s.block === shared[0].block)
check('shared block identical', allSame, `${shared[0].block.length} chars x ${shared.length}`)
check('every program can create ang.json', shared.every((s) => s.body.includes('def save_ang(') && s.body.includes('creating it with the default angles')))
check('no program reads ANG from a literal pose', shared.every((s) => s.body.includes('ANG = load_ang(ANG_FILE)')))

/* -------------------------------------------------------- 4 stale wording */
console.log('\n=== 4. wording that would contradict the new layout ===')
const STALE = [
  [/\bstand\.py\b/, 'stand.py (old file name)'],
  [/\bdance\.py\b/, 'dance.py (old file name)'],
  [/\bai\.py\b/, 'ai.py (old file name)'],
  [/Thonny/i, 'Thonny (old tool)'],
  [/single string/, 'page is a single string'],
  [/forty-line web server/, 'forty-line web server'],
  [/Three details/, 'three details (list has four)'],
  [/^PAGE = """/m, 'inline PAGE constant'],
]
let staleHits = 0
nodes.forEach((n, i) => {
  const s = n.type === 'vue' && n.attrs?.type === 'vfiles'
    ? JSON.parse(n.attrs.content).items[0].children.map((f) => f.content).join('\n')
    : txt(n)
  for (const [re, label] of STALE) {
    if (re.test(s)) {
      staleHits++
      console.log(`  node ${String(i).padStart(3)}: ${label}`)
    }
  }
})
check('no stale wording', staleHits === 0, `${staleHits} hit(s)`)

/* --------------------------------------------- 5 admin-UI added WiFi steps */
console.log('\n=== 5. WiFi setup steps added in the admin UI ===')
const wanted = ['Connect to the hotspot', 'Open the setup page', 'Choose the school WiFi', 'Restart and note the address']
for (const w of wanted) {
  const hit = nodes.some((n) => txt(n).includes(w))
  check(`  step kept: ${w}`, hit)
}
const images = nodes.filter((n) => n.type === 'image').length
console.log(`images in chapter: ${images}`)

/* -------------------------------------------------------- 6 structure */
console.log('\n=== 6. structure ===')
const heads = nodes.filter((n) => n.type === 'heading')
const ids = heads.map((h) => h.attrs?.id)
check('heading ids unique', new Set(ids).size === ids.length, `${heads.length} headings`)
check('every heading bold', heads.every((h) => h.content?.[0]?.marks?.some((m) => m.type === 'bold')))
const tablesOk = nodes.filter((n) => n.type === 'table').every((tb) => {
  const cols = tb.content[0].content.length
  return tb.content.every((r) => r.content.length === cols)
})
check('table column counts consistent', tablesOk)
for (let i = 0; i < nodes.length; i++) {
  if (nodes[i].type === 'heading' && nodes[i].attrs.level === 2 && /Activity/.test(txt(nodes[i]))) {
    if (nodes[i + 1]?.type !== 'blockquote') warn('Activity without intro blockquote', txt(nodes[i]))
  }
}
const acts = nodes.filter((n) => n.type === 'heading' && n.attrs.level === 2 && /Activity/.test(txt(n))).map((n) => txt(n))
console.log('activities:', acts.join(' | '))

/* ------------------------------------------------------------ summary */
await sql.end()
const failed = results.filter((r) => !r.ok)
console.log(`\n=== summary: ${results.length - failed.length}/${results.length} checks passed ===`)
if (failed.length) {
  console.log('failed:')
  failed.forEach((f) => console.log('  - ' + f.name + (f.detail ? ' (' + f.detail + ')' : '')))
  process.exit(1)
}
