/**
 * Chapter 217 (course 7, Robot Programming) - third pass.
 *
 * 1. Activity 1 now ships a WiFi tuning tool ("standing pose tuner over WiFi"):
 *    twelve sliders in a phone browser, save to ang.json, reload. The old
 *    description talked about editing numbers in a file and running once, so it
 *    is rewritten to match the code that is actually on the page.
 * 2. The final homework now wants four videos: standing, walking, dancing, voice.
 * 3. A second homework asks for a new move written with OpenCode.
 *
 * Everything the teacher added (firmware .bin, CH341SER.rar, the extra
 * screenshots) is left exactly where it is - every edit here matches on text
 * and replaces one node, never the whole chapter.
 *
 *   node update.mjs --dry
 *   node update.mjs
 */
import postgres from '/Users/oldmoon/Documents/ubuntu/nuxt_lms_2026/node_modules/postgres/src/index.js'

const BASE = process.env.LMS || 'http://10.28.1.151'
const USER = process.env.LMS_USER || 'admin'
const PASS = process.env.LMS_PASS || 'REDACTED'
const COURSE = 7
const CHAPTER = 217
const DRY = process.argv.includes('--dry')

/* ---------------------------------------------------------------- helpers */
const PA = { indent: null, margin: null, wordWrap: 'normal', textAlign: null, indentUnit: null, lineHeight: 1.75 }
let uid = 0
const nid = () => 'r' + (uid++).toString(36) + Math.random().toString(36).slice(2, 5)
const t = (text, marks) => ({ type: 'text', text, ...(marks ? { marks } : {}) })
const seg = (s) =>
  typeof s === 'string' ? t(s)
  : s.code !== undefined ? t(s.code, [{ type: 'code' }])
  : s.bold !== undefined ? t(s.bold, [{ type: 'bold' }])
  : t(s.text)
const p = (...segs) => ({ type: 'paragraph', attrs: { ...PA }, content: segs.map(seg) })
const ol = (items) => ({
  type: 'orderedList', attrs: { type: null, start: 1, margin: null, listType: 'decimal' },
  content: items.map((it) => ({ type: 'listItem', attrs: { indent: null, indentUnit: null }, content: [Array.isArray(it) ? p(...it) : p(it)] })),
})
const ul = (items) => ({
  type: 'bulletList', attrs: { type: null, margin: null, listType: 'disc' },
  content: items.map((it) => ({ type: 'listItem', attrs: { indent: null, indentUnit: null }, content: [Array.isArray(it) ? p(...it) : p(it)] })),
})
const quote = (...blocks) => ({ type: 'blockquote', content: blocks.filter(Boolean) })
const h3 = (text) => {
  const id = nid()
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
const pre = (text) => ({
  type: 'codeBlock',
  attrs: { theme: 'light', margin: null, language: 'text', textWrap: true },
  content: [t(text)],
})
const txt = (n) => (!n || typeof n !== 'object' ? '' : n.type === 'text' ? n.text || '' : Array.isArray(n.content) ? n.content.map(txt).join('') : '')

/* ---------------------------------------------------------------- prompts */
const NEW_MOVE_PROMPT = `Add one new move to main.py in this folder.

- Read the existing moves first (nod, twist, flap, toe_tap, peacock, lotus, bow)
  and copy the shape they use: a counter that walks a range, writing each joint
  as base + k * a, with time.sleep_ms between frames.
- Name it wave_hello: the right arm lifts, the hand swings left and right three
  times, then the arm comes back to the standing pose.
- The first and last frame must be ANG, otherwise the next move starts from a
  pose it did not expect.
- Call it once from show(), right after the second nod().
- Do not rename or delete anything else, and keep the file under 400 lines.

Acceptance: on the robot the move goes out and comes back with no jump at either
end, and running the whole show twice in a row still ends standing. Tell me the
function name and the line numbers you added.`

/* ------------------------------------------------------------------ login */
const login = await fetch(`${BASE}/api/auth/login`, {
  method: 'POST', headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ username: USER, password: PASS }),
})
const cookie = (login.headers.getSetCookie?.() || []).map((c) => c.split(';')[0]).join('; ')
if (!login.ok || !cookie) { console.error('login failed', login.status); process.exit(1) }

const sql = postgres(
  process.env.PG || 'postgresql://postgres:REDACTED@10.28.1.151:5432/nuxt_lms_2026',
  { idle_timeout: 10, max: 1 },
)

const doc = (...paragraphs) => ({ type: 'doc', content: paragraphs })

/* ------------------------------------------------ homework 1: four videos */
const EVIDENCE_CID = 12
const evidence = doc(
  p('🎬 Four short videos, one per program. Film the robot, not the screen - a phone camera on a tripod or a friend holding it is fine.'),
  ol([
    [ { bold: 'Standing' }, ' (Activity 1) - the robot stands for ten seconds with nobody touching it. Include the moment you let go.' ],
    [ { bold: 'Walking' }, ' (Activity 2) - press Forward on the phone and film the whole move, about one metre.' ],
    [ { bold: 'Dancing' }, ' (Activity 3) - the full show, or at least three different moves, one after another.' ],
    [ { bold: 'Voice' }, ' (Activity 4) - say one command out loud, and keep filming while the OLED face changes and the arm moves.' ],
  ]),
  p('Each clip 10-20 seconds, landscape, robot in frame the whole time. Keep each under 40 MB - the upload will refuse anything bigger.'),
  p('Marked on four things: all four clips are there, the action is actually visible, the voice clip has your command audible, and the robot ends each clip standing.'),
)

/* --------------------------------------------- homework 2: a new move */
const NEW_MOVE_NAME = '🤖 Your new move, written with OpenCode'
const existingMove = await sql`select cid from homeworks where course_id = ${COURSE} and name = ${NEW_MOVE_NAME} and deleted_at is null limit 1`
let moveCid = existingMove[0]?.cid

const moveHomework = doc(
  p('🤖 Ask OpenCode for one new move that the seven built-in ones do not do, run it on the robot, and show it working.'),
  p('Submit a 10 second clip of the move, plus one line with the prompt you used and the function name OpenCode ended up with.'),
  p('Marked on three things: the move is genuinely new (not nod or bow with a different name), it starts and ends at the standing pose so the show still works, and it repeats cleanly three times in a row.'),
)

if (DRY) {
  console.log(`homework ${EVIDENCE_CID}: would update to the four-video version`)
  console.log(`homework "${NEW_MOVE_NAME}":`, moveCid ? `reuse cid ${moveCid}` : 'would be created')
} else {
  const r1 = await fetch(`${BASE}/api/homeworks/update`, {
    method: 'POST', headers: { 'Content-Type': 'application/json', Cookie: cookie },
    body: JSON.stringify({ course_id: COURSE, id: EVIDENCE_CID, name: '🎬 Your robot programming evidence', content: evidence, point: 10 }),
  })
  console.log(`~ homework ${EVIDENCE_CID} updated: ${r1.status}`)

  if (!moveCid) {
    const res = await fetch(`${BASE}/api/homeworks/add`, {
      method: 'POST', headers: { 'Content-Type': 'application/json', Cookie: cookie },
      body: JSON.stringify({ course_id: COURSE, name: NEW_MOVE_NAME, content: moveHomework, point: 10 }),
    })
    const body = await res.json().catch(() => null)
    if (!body?.success) { console.error('homework create failed:', JSON.stringify(body).slice(0, 200)); process.exit(1) }
    moveCid = body.data.cid
    console.log(`+ homework cid ${moveCid}  ${NEW_MOVE_NAME}`)
  } else {
    await fetch(`${BASE}/api/homeworks/update`, {
      method: 'POST', headers: { 'Content-Type': 'application/json', Cookie: cookie },
      body: JSON.stringify({ course_id: COURSE, id: moveCid, name: NEW_MOVE_NAME, content: moveHomework, point: 10 }),
    })
    console.log(`~ homework ${moveCid} updated`)
  }
}

/* ------------------------------------------------------------ the chapter */
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
  const arr = Array.isArray(made) ? made : [made]
  nodes.splice(i, 1, ...arr)
  log.push('  ' + label + (arr.length > 1 ? ` (+${arr.length - 1} nodes)` : ''))
}
const insertBefore = (match, block, label) => {
  const i = nodes.findIndex(match)
  if (i < 0) { log.push('  SKIP (anchor not found): ' + label); return }
  nodes.splice(i, 0, ...block)
  log.push('  ' + label)
}

/* --- Activity 1: the WiFi tuner ----------------------------------------- */
replace(
  (n) => n.type === 'blockquote' && txt(n).startsWith('🧍 One job'),
  () => quote(
    p('🧍 One job: twelve angles that keep the robot upright - and this time you tune them from your phone, with the robot moving while you look at it.'),
    ol([
      'Set up the board and put the two files on it.',
      'Open the tuner in a browser and drag a slider.',
      'Save the pose, reboot the board, and check it still stands.',
    ]),
  ),
  'Activity 1: intro',
)

replace(
  (n) => n.type === 'table' && txt(n).includes('reads the file, writes every joint once, then holds'),
  () => table(['File', 'What it holds', 'Do you edit it?'], [
    [{ code: 'ang.json' }, 'the twelve standing angles', 'no - the tuner writes it for you'],
    [{ code: 'main.py' }, 'the tuner: a web page with twelve sliders, plus the servo code', 'the WiFi name and password'],
  ]),
  'Activity 1: file table',
)

replace(
  (n) => n.type === 'paragraph' && txt(n).startsWith('You only have to create'),
  () => p('You only have to create ', { code: 'main.py' }, '. The first run writes ', { code: 'ang.json' }, ' with the default angles, and every save from the tuner overwrites it.'),
  'Activity 1: two-file note',
)

replace(
  (n) => n.type === 'heading' && txt(n).includes('3️⃣ One Table for Twelve Joints'),
  () => h3('3️⃣ Open the Tuner'),
  'Activity 1: heading 3',
)

replace(
  (n) => n.type === 'paragraph' && txt(n).startsWith('A servo wants a 0.5 ms pulse'),
  () => [
    p('Power the board. It joins ', { code: 'MINXIN-S' }, ' and prints an IP address in the Shell - open that address in a browser on a phone that is on the same WiFi. The robot answers with a page of twelve sliders.'),
    table(['On the page', 'What it does'], [
      ['Twelve sliders', 'one per joint, 0-180 degrees; dragging one moves that servo immediately'],
      ['保存到 ang.json', 'writes the live pose to the file on the board'],
      ['重新读取', 'reads the file back and drives all twelve joints to it'],
      ['Status line', [{ code: 'Pose loaded' }, ' / ', { code: 'Saved to ang.json' }, ' / ', { code: 'Save failed' }]],
    ]),
    p('The page is built with the current angles already in it, so the sliders start where the robot is - no jump to 90 degrees on load. Under them, the only arithmetic in the program is the duty conversion: 0.5 ms at 0 degrees, 2.5 ms at 180, so ', { code: 'duty = degrees * 0.56 + 25' }, '.'),
  ],
  'Activity 1: tuner page + table',
)

replace(
  (n) => n.type === 'heading' && txt(n).includes('4️⃣ Tune It by Eye'),
  () => h3('4️⃣ Tune, Save, Reboot'),
  'Activity 1: heading 4',
)

replace(
  (n) => n.type === 'paragraph' && txt(n).startsWith('Power on, hold the robot'),
  () => p('Prop the robot up so the legs hang free, then drag one slider and watch which joint answers. A servo that buzzes or strains is near the end of its travel - back it off before it gets warm.'),
  'Activity 1: how to tune',
)

replace(
  (n) => n.type === 'bulletList' && txt(n).includes('One row at a time'),
  () => ul([
    'One slider at a time. Two joints moving together tells you nothing about which one helped.',
    'Two or three degrees is a visible change on this robot; one degree usually is not.',
    'If a change makes the fall worse, go the other way on that joint - the sign depends on how the horn was mounted.',
  ]),
  'Activity 1: tuning advice',
)

replace(
  (n) => n.type === 'paragraph' && txt(n).startsWith('The robot stands for ten seconds'),
  () => p('Save, then unplug the board and plug it back in. It stands for ten seconds on its own, and ', { code: 'ang.json' }, ' on the board holds your numbers instead of the defaults.'),
  'Activity 1: check yourself',
)

/* --- Activity 5: the new-move section ----------------------------------- */
replace(
  (n) => n.type === 'heading' && txt(n).includes('Submit Your Homework'),
  () => [
    h3('🤖 Add a Move with OpenCode'),
    p('The dance program is a list of moves, and every move is the same small loop with different numbers. Ask OpenCode to write one of your own - then read what it wrote before you run it.'),
    pre(NEW_MOVE_PROMPT),
    p('If the move jerks at the start, the first frame is not at ', { code: 'ANG' }, ' - that is the one thing worth checking first.'),
    h3('📤 Submit Your Homework'),
  ],
  'Activity 5: new move section',
)

// the second homework card, right after the evidence one
const evidenceIdx = nodes.findIndex((n) => n.type === 'vue' && n.attrs?.type === 'homework' && n.attrs.content === String(EVIDENCE_CID))
if (evidenceIdx >= 0) {
  const block = [
    h3('📤 Submit Your New Move'),
    p('Upload the 10 second clip here, with the prompt you gave OpenCode in the message box.'),
    { type: 'vue', attrs: { type: 'homework', height: null, content: String(moveCid || 0) } },
  ]
  // skip the old "Share your idea" heading if it sits directly after the card
  nodes.splice(evidenceIdx + 1, 0, ...block)
  log.push('  Activity 5: second homework card')
} else {
  log.push('  SKIP: evidence homework node not found')
}

/* ---------------------------------------------------------------- checks */
const problems = []
const heads = nodes.filter((x) => x.type === 'heading')
if (new Set(heads.map((h) => h.attrs.id)).size !== heads.length) problems.push('duplicate heading ids')
const walkBad = (node, path) => {
  if (!node || typeof node !== 'object') { problems.push('not an object at ' + path); return }
  if (!node.type) { problems.push('missing type at ' + path); return }
  if (node.type === 'text' && (typeof node.text !== 'string' || node.text === '')) problems.push('empty text at ' + path)
  if (node.type === 'codeBlock' && !node.attrs?.language) problems.push('codeBlock without language at ' + path)
  ;(node.content || []).forEach((c, i) => walkBad(c, path + '/' + node.type + '[' + i + ']'))
}
walkBad(docObj, 'doc')

console.log(log.join('\n'))
console.log(`\nnodes: ${nodes.length} | problems: ${problems.length ? problems.join('; ') : 'none'}`)

if (DRY) {
  console.log('\n--dry: nothing sent')
  await sql.end()
  process.exit(problems.length ? 1 : 0)
}
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
after.filter((n) => n.type === 'heading' || (n.type === 'vue' && n.attrs.type === 'homework')).forEach((n) => {
  const tag = n.type === 'heading' ? 'h' + n.attrs.level : 'homework'
  console.log(`  ${tag.padEnd(9)} ${n.type === 'heading' ? txt(n).slice(0, 58) : 'cid ' + n.attrs.content}`)
})
await sql.end()
