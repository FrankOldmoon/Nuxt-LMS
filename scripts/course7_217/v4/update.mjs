/**
 * Chapter 217 - fourth pass.
 *
 * Two things the teacher asked for:
 *
 * 1. ang.json should not exist for the student. The board keeps the pose; the
 *    tuner in Activity 1 writes it; nobody opens a file on their laptop. So the
 *    remaining ang.json rows come out of the file tables, the file comes out of
 *    the three later vfiles blocks, and every sentence that told the student to
 *    create or edit it is rewritten.
 *
 * 2. "Your robot programming evidence" (homework 12) moves from Activity 5 to
 *    the end of Activity 4 - that is where the fourth program, and therefore
 *    the fourth video, is finished.
 *
 *   node update.mjs --dry
 *   node update.mjs
 */
import postgres from '/Users/oldmoon/Documents/ubuntu/nuxt_lms_2026/node_modules/postgres/src/index.js'

const BASE = process.env.LMS || 'http://10.28.1.151'
const USER = process.env.LMS_USER || 'admin'
const PASS = process.env.LMS_PASS
const CHAPTER = 217
const HW_CID = 12
const DRY = process.argv.includes('--dry')

/* ---------------------------------------------------------------- helpers */
const PA = { indent: null, margin: null, wordWrap: 'normal', textAlign: null, indentUnit: null, lineHeight: 1.75 }
const t = (text, marks) => ({ type: 'text', text, ...(marks ? { marks } : {}) })
const seg = (s) =>
  typeof s === 'string' ? t(s)
  : s.code !== undefined ? t(s.code, [{ type: 'code' }])
  : s.bold !== undefined ? t(s.bold, [{ type: 'bold' }])
  : t(s.text)
const p = (...segs) => ({ type: 'paragraph', attrs: { ...PA }, content: segs.map(seg) })
const h3 = (text) => {
  const id = 'r4' + Math.random().toString(36).slice(2, 8)
  return { type: 'heading', attrs: { id, level: 3, ...PA, 'data-toc-id': id }, content: [t(text, [{ type: 'bold' }])] }
}
const HDR = { align: null, color: null, colspan: 1, rowspan: 1, colwidth: null, background: 'rgb(242,243,245)' }
const CELL = { align: null, color: null, colspan: 1, rowspan: 1, colwidth: null, background: null }
const cell = (node, kind) => ({ type: kind, attrs: { ...(kind === 'tableHeader' ? HDR : CELL) }, content: [Array.isArray(node) ? p(...node) : p(node)] })
const table = (headers, rows) => ({
  type: 'table', attrs: { margin: null },
  content: [{ type: 'tableRow', content: headers.map((x) => cell(x, 'tableHeader')) },
    ...rows.map((r) => ({ type: 'tableRow', content: r.map((c) => cell(c, 'tableCell')) }))],
})
const txt = (n) => (!n || typeof n !== 'object' ? '' : n.type === 'text' ? n.text || '' : Array.isArray(n.content) ? n.content.map(txt).join('') : '')

const replaceListItem = (nodeMatch, itemStarts, newText, label) => {
  const i = nodes.findIndex(nodeMatch)
  if (i < 0) { log.push('  SKIP (not found): ' + label); return }
  const clone = JSON.parse(JSON.stringify(nodes[i]))
  let done = false
  const lists = clone.type === 'orderedList' || clone.type === 'bulletList'
    ? [clone]
    : clone.content.filter((c) => c.type === 'orderedList' || c.type === 'bulletList')
  for (const list of lists) {
    const j = list.content.findIndex((li) => txt(li).startsWith(itemStarts))
    if (j >= 0) {
      list.content[j] = { type: 'listItem', attrs: { indent: null, indentUnit: null }, content: [p(newText)] }
      done = true
      break
    }
  }
  if (!done) { log.push('  no list item matched: ' + label); return }
  nodes[i] = clone
  log.push('  ' + label)
}
const replaceLastParagraph = (nodeMatch, newText, label) => {
  const i = nodes.findIndex(nodeMatch)
  if (i < 0) { log.push('  SKIP (not found): ' + label); return }
  const clone = JSON.parse(JSON.stringify(nodes[i]))
  const j = clone.content.map((c) => c.type).lastIndexOf('paragraph')
  if (j < 0) { log.push('  no paragraph in: ' + label); return }
  clone.content[j] = p(newText)
  nodes[i] = clone
  log.push('  ' + label)
}


/* ------------------------------------------------------------------ login */
const login = await fetch(`${BASE}/api/auth/login`, {
  method: 'POST', headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ username: USER, password: PASS }),
})
const cookie = (login.headers.getSetCookie?.() || []).map((c) => c.split(';')[0]).join('; ')
if (!login.ok || !cookie) { console.error('login failed', login.status); process.exit(1) }

const sql = postgres(
  process.env.PG,
  { idle_timeout: 10, max: 1 },
)

const show = await fetch(`${BASE}/api/chapters/show?id=${CHAPTER}`, { headers: { Cookie: cookie } })
const chapter = (await show.json()).data.chapter
const docObj = chapter.content
const nodes = docObj.content
if (!Array.isArray(nodes)) { console.error('chapter content is not a doc'); process.exit(1) }

const log = []
const replace = (match, make, label) => {
  const i = nodes.findIndex(match)
  if (i < 0) { log.push('  SKIP (not found): ' + label); return }
  const made = make()
  nodes.splice(i, 1, ...(Array.isArray(made) ? made : [made]))
  log.push('  ' + label)
}

/** Replace exact substrings inside the text runs of one node. */
const patchTexts = (match, pairs, label) => {
  const i = nodes.findIndex(match)
  if (i < 0) { log.push('  SKIP (not found): ' + label); return }
  const clone = JSON.parse(JSON.stringify(nodes[i]))
  let hits = 0
  const walk = (n) => {
    if (!n || typeof n !== 'object') return
    if (n.type === 'text' && typeof n.text === 'string') {
      for (const [from, to] of pairs) {
        if (n.text.includes(from)) { n.text = n.text.replace(from, to); hits++ }
      }
    }
    ;(n.content || []).forEach(walk)
  }
  walk(clone)
  if (!hits) { log.push('  no text matched: ' + label); return }
  nodes[i] = clone
  log.push('  ' + label)
}

/* --- 1. drop ang.json from every vfiles block ---------------------------- */
for (const n of nodes) {
  if (n.type !== 'vue' || n.attrs?.type !== 'vfiles') continue
  const spec = JSON.parse(n.attrs.content)
  const folder = spec.items[0]
  const before = folder.children.map((f) => f.label)
  if (!before.includes('ang.json')) continue
  folder.children = folder.children.filter((f) => f.label !== 'ang.json')
  n.attrs.content = JSON.stringify(spec)
  log.push(`  vfiles ${before.join('+')} -> ${folder.children.map((f) => f.label).join('+')}`)
}

/* --- 2. Activity 1: one file, no ang.json ------------------------------- */
replace(
  (n) => n.type === 'paragraph' && txt(n).startsWith('Make a project folder'),
  () => p({ bold: 'Make a project folder.' }, ' One file goes in it: ', { code: 'main.py' }, ', and nothing else.'),
  'Activity 1: folder step',
)
replace(
  (n) => n.type === 'heading' && txt(n).includes('2️⃣ The Two Files'),
  () => h3('2️⃣ One File on the Board'),
  'Activity 1: heading 2',
)
replace(
  (n) => n.type === 'table' && txt(n).includes('the tuner: a web page with twelve sliders'),
  () => table(['File', 'What it holds', 'Do you edit it?'], [
    [{ code: 'main.py' }, 'the tuner: a web page with twelve sliders, plus the servo code', 'the WiFi name and password'],
  ]),
  'Activity 1: file table',
)
replace(
  (n) => n.type === 'paragraph' && txt(n).startsWith('You only have to create'),
  () => p('The board keeps the pose by itself. The first run prepares a default one and every save from the tuner overwrites it, so there is nothing to open, copy or edit on your computer.'),
  'Activity 1: two-file note',
)
replace(
  (n) => n.type === 'paragraph' && txt(n).startsWith('Save, then unplug the board'),
  () => p('Save, then unplug the board and plug it back in. It stands for ten seconds on its own, on the numbers you just saved rather than the defaults.'),
  'Activity 1: check yourself',
)

/* --- 3. Activity 2: two files ------------------------------------------ */
replace(
  (n) => n.type === 'heading' && txt(n).includes('1️⃣ Three Files on the Board'),
  () => h3('1️⃣ Two Files on the Board'),
  'Activity 2: heading 1',
)

/* --- 4. Activity 3: no file talk --------------------------------------- */
replace(
  (n) => n.type === 'heading' && txt(n).includes('1️⃣ Two Files, No Network'),
  () => h3('1️⃣ The Program'),
  'Activity 3: heading 1',
)
replaceListItem(
  (n) => n.type === 'blockquote' && txt(n).includes('seven-move show'),
  'Save main.py to the board',
  'Save main.py to the board and run it.',
  'Activity 3: intro step 1',
)

/* --- 5. Activity 4: two files ------------------------------------------ */
replace(
  (n) => n.type === 'heading' && txt(n).includes('2️⃣ Wire It Up, Then Three Files'),
  () => h3('2️⃣ Wire It Up, Then Two Files'),
  'Activity 4: heading 2',
)
replace(
  (n) => n.type === 'paragraph' && txt(n).startsWith('Cross the two data lines'),
  () => p('Cross the two data lines - module TX to board RX - and share ground. Then two files:'),
  'Activity 4: file lead-in',
)
replace(
  (n) => n.type === 'table' && txt(n).includes('UART reader, seven actions, OLED face'),
  () => table(['File', 'What it holds', 'Do you edit it?'], [
    [{ code: 'main.py' }, 'UART reader, seven actions, OLED face', ['the ', { code: 'CMDS' }, ' table']],
    [{ code: 'ssd1306.py' }, 'the OLED driver', ['no - but ', { code: 'import ssd1306' }, ' fails without it']],
  ]),
  'Activity 4: file table',
)

/* --- 5b. the remaining mentions in running text ------------------------ */
// text runs are split by code marks, so whole-sentence matching fails; replace
// the one list item / paragraph that carries the mention instead
replaceLastParagraph(
  (n) => n.type === 'blockquote' && txt(n).includes('All four read the same ang.json'),
  'Activity 1 ends with the pose written on the board itself, so every later program starts from the robot you tuned - nothing to copy between files.',
  'cover: last line',
)
replaceListItem(
  (n) => n.type === 'orderedList' && txt(n).startsWith('Tune twelve angles in ang.json'),
  'Tune twelve angles in',
  'Tune the twelve servos from a web page until the robot stands without help.',
  'objectives: item 1',
)
replaceListItem(
  (n) => n.type === 'blockquote' && txt(n).includes('Save main.py and control.html to the board'),
  'Save main.py and control.html',
  'Save main.py and control.html to the board.',
  'Activity 2: intro step 2',
)
replaceListItem(
  (n) => n.type === 'blockquote' && txt(n).includes('Wire it to UART2'),
  'Wire it to UART2',
  'Wire it to UART2, then save main.py and ssd1306.py.',
  'Activity 4: intro step 2',
)

/* --- 6. move homework 12 to the end of Activity 4 ---------------------- */
const hwIdx = nodes.findIndex((n) => n.type === 'vue' && n.attrs?.type === 'homework' && n.attrs.content === String(HW_CID))
let moved = false
if (hwIdx > 0) {
  // the heading and lead-in that belong to this card
  let from = hwIdx
  while (from > 0 && !(nodes[from].type === 'heading' && txt(nodes[from]).includes('Submit Your Homework'))) from--
  const block = nodes.splice(from, hwIdx - from + 1)
  log.push(`  lifted homework ${HW_CID} (${block.length} nodes) out of Activity 5`)

  // replace the old lead-in with something that fits the four videos
  const lead = block.findIndex((n) => n.type === 'paragraph' && txt(n).startsWith('Finished the challenges'))
  if (lead >= 0) {
    block[lead] = p('All four programs are running. Film each one - standing, walking, dancing, voice - and upload the four clips below.')
  }

  // land it after Activity 4's Check Yourself
  const anchor = nodes.findIndex((n) => n.type === 'paragraph' && txt(n).startsWith('Say each of the seven phrases once'))
  if (anchor < 0) {
    log.push('  SKIP: Activity 4 check paragraph not found')
  } else {
    nodes.splice(anchor + 1, 0, ...block)
    moved = true
    log.push('  placed it at the end of Activity 4')
  }
}

/* ---------------------------------------------------------------- checks */
const problems = []
const heads = nodes.filter((x) => x.type === 'heading')
if (new Set(heads.map((h) => h.attrs.id)).size !== heads.length) problems.push('duplicate heading ids')
const walkBad = (node, path) => {
  if (!node || typeof node !== 'object') { problems.push('not an object at ' + path); return }
  if (!node.type) { problems.push('missing type at ' + path); return }
  if (node.type === 'text' && (typeof node.text !== 'string' || node.text === '')) problems.push('empty text at ' + path)
  ;(node.content || []).forEach((c, i) => walkBad(c, path + '/' + node.type + '[' + i + ']'))
}
walkBad(docObj, 'doc')

// ang.json must survive only as the button label the tuner shows on the page,
// so the UI table in Activity 1 (which quotes real button names) is exempt
const uiTable = (n) => n.type === 'table' && txt(n).includes('保存到 ang.json')
const prose = nodes.filter((n) => !uiTable(n)).map(txt).join(' ')
const angMentions = (prose.match(/ang\.json/g) || []).length
if (angMentions) {
  problems.push(`ang.json still mentioned ${angMentions}x outside the button label`)
  nodes.forEach((n, i) => {
    const t = txt(n)
    if (t.includes('ang.json')) console.log(`   still: [${i}] ${n.type} ${t.replace(/\s+/g, ' ').slice(0, 140)}`)
  })
}

const vfilesWithAng = nodes.filter((n) => {
  if (n.type !== 'vue' || n.attrs?.type !== 'vfiles') return false
  return JSON.parse(n.attrs.content).items[0].children.some((f) => f.label === 'ang.json')
}).length
if (vfilesWithAng) problems.push(`ang.json still shipped in ${vfilesWithAng} vfiles block(s)`)

console.log(log.join('\n'))
console.log(`\nnodes: ${nodes.length} | ang.json mentions: ${angMentions} | problems: ${problems.length ? problems.join('; ') : 'none'}`)

if (DRY) { console.log('\n--dry: nothing sent'); await sql.end(); process.exit(problems.length ? 1 : 0) }
if (problems.length) { console.error('refusing to upload'); await sql.end(); process.exit(1) }

const upd = await fetch(`${BASE}/api/chapters/update`, {
  method: 'POST', headers: { 'Content-Type': 'application/json', Cookie: cookie },
  body: JSON.stringify({ id: CHAPTER, content: docObj }),
})
console.log('chapter update:', upd.status, (await upd.text()).slice(0, 140))

/* ---------------------------------------------------------------- verify */
const back = await fetch(`${BASE}/api/chapters/show?id=${CHAPTER}`, { headers: { Cookie: cookie } })
const after = (await back.json()).data.chapter.content.content
console.log(`\nchapter ${CHAPTER}: ${after.length} nodes`)
after.filter((n) => n.type === 'heading' || (n.type === 'vue' && ['homework', 'vfiles'].includes(n.attrs.type))).forEach((n) => {
  if (n.type === 'heading') console.log(`  h${n.attrs.level}        ${txt(n).slice(0, 52)}`)
  else if (n.attrs.type === 'homework') console.log(`  homework cid ${n.attrs.content}`)
  else console.log(`  vfiles   ${JSON.parse(n.attrs.content).items[0].children.map((f) => f.label).join(' + ')}`)
})
await sql.end()
