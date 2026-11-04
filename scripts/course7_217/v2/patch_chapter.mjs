/**
 * Convert Activities 2-4 of chapter 217 (course 7, "Robot Programming") to the
 * same file layout as Activity 1's "Move one servo": a `vfiles` node holding
 * ang.json + main.py (+ control.html for the WiFi program) instead of one long
 * code block.
 *
 * It patches the live chapter in place - images, the PyCharm walkthrough and
 * everything else the teacher added stay untouched - then posts the result to
 * /api/chapters/update and re-reads it to prove the round trip.
 *
 *   node patch_chapter.mjs --dry   # build and check, write nothing
 *   node patch_chapter.mjs         # upload
 */
import { readFileSync } from 'node:fs'
import postgres from '/Users/oldmoon/Documents/ubuntu/nuxt_lms_2026/node_modules/postgres/src/index.js'

const HERE = '/Users/oldmoon/Documents/ubuntu/nuxt_lms_2026/scripts/course7_217/v2'
const BASE = process.env.LMS || 'http://10.28.1.151'
const USER = process.env.LMS_USER || 'admin'
if (!process.env.LMS_PASS) throw new Error('请设置 LMS_PASS 环境变量（LMS 管理员密码）')
const PASS = process.env.LMS_PASS
const DRY = process.argv.includes('--dry')
const DIFF = process.argv.includes('--diff')
const FILES_ONLY = process.argv.includes('--files-only')
const ONLY = (process.argv.find((a) => a.startsWith('--only=')) || '').slice(7)
const CH_ID = 217

/* ------------------------------------------------------------------ nodes */
const PA = { indent: null, margin: null, wordWrap: 'normal', textAlign: null, indentUnit: null, lineHeight: 1.75 }
let uid = 0
const nid = () => 'v2' + (uid++).toString(36) + Math.random().toString(36).slice(2, 5)
const t = (text, marks) => ({ type: 'text', text, ...(marks ? { marks } : {}) })
const seg = (s) => {
  if (typeof s === 'string') return t(s)
  if (s.code !== undefined) return t(s.code, [{ type: 'code' }])
  return t(s.bold, [{ type: 'bold' }])
}
const p = (...segs) => ({ type: 'paragraph', attrs: { ...PA }, content: segs.map(seg) })
const ul = (items) => ({
  type: 'bulletList', attrs: { type: null, margin: null, listType: 'disc' },
  content: items.map((it) => ({ type: 'listItem', attrs: { indent: null, indentUnit: null }, content: [p(...(Array.isArray(it) ? it : [it]))] })),
})
const ol = (items) => ({
  type: 'orderedList', attrs: { type: null, start: 1, margin: null, listType: 'decimal' },
  content: items.map((it) => ({ type: 'listItem', attrs: { indent: null, indentUnit: null }, content: [p(...(Array.isArray(it) ? it : [it]))] })),
})
const quote = (...blocks) => ({ type: 'blockquote', content: blocks })

/** One `vfiles` node: folder + the given files, each fenced for the viewer. */
const vfiles = (files) => ({
  type: 'vue',
  attrs: {
    type: 'vfiles',
    height: null,
    content: JSON.stringify({
      items: [{
        id: 'f1', label: 'Folder', type: 'folder',
        children: files.map((f, i) => ({
          id: (f.id || 'n' + i),
          label: f.name,
          type: 'file',
          content: '```' + f.lang + '\n' + f.text.replace(/\s+$/, '') + '\n```',
        })),
      }],
    }),
  },
})

/* ------------------------------------------------------------------ input */
const read = (rel) => readFileSync(`${HERE}/${rel}`, 'utf8')
const ANG = read('ang.json')
const STAND_PY = read('stand/main.py')
const WIFI_PY = read('wifi/main.py')
const CONTROL_HTML = read('wifi/control.html')
const DANCE_PY = read('dance/main.py')
const AI_PY = read('ai/main.py')
const SSD1306_PY = read('ai/ssd1306.py')

const ANG_FILE = { id: 'n1', name: 'ang.json', lang: 'json', text: ANG }

const FILES = {
  stand: [ANG_FILE, { id: 'file1', name: 'main.py', lang: 'python', text: STAND_PY }],
  wifi: [ANG_FILE, { id: 'n2', name: 'control.html', lang: 'html', text: CONTROL_HTML }, { id: 'file1', name: 'main.py', lang: 'python', text: WIFI_PY }],
  dance: [ANG_FILE, { id: 'file1', name: 'main.py', lang: 'python', text: DANCE_PY }],
  ai: [
    ANG_FILE,
    { id: 'file1', name: 'main.py', lang: 'python', text: AI_PY },
    { id: 'lib1', name: 'ssd1306.py', lang: 'python', text: SSD1306_PY },
  ],
}

/* ------------------------------------------------------------------ patch */
const sql = postgres(process.env.PG, { idle_timeout: 10, max: 1 })
const row = (await sql`select content from chapters where id = ${CH_ID}`)[0]
const doc = row.content
const txt = (n) => (!n || typeof n !== 'object' ? '' : n.type === 'text' ? n.text || '' : Array.isArray(n.content) ? n.content.map(txt).join('') : '')
let nodes = doc.content
const baseline = JSON.parse(JSON.stringify(nodes))   // untouched copy for --diff

const log = []
let skipped = 0
const swap = (match, make, label, fileBlock = false) => {
  if (ONLY && !label.includes(ONLY)) {
    log.push('  skip (--only): ' + label)
    return
  }
  if (FILES_ONLY && !fileBlock) {
    log.push('  skip (--files-only): ' + label)
    return
  }
  const i = nodes.findIndex(match)
  if (i < 0) {
    skipped++
    log.push('  SKIP (not found - already converted?): ' + label)
    return
  }
  nodes[i] = make(nodes[i])
  log.push('  ' + label)
}

const isProgram = (tag) => (n) =>
  (n.type === 'codeBlock' && txt(n).includes(tag)) ||
  (n.type === 'vue' && n.attrs?.type === 'vfiles' && n.attrs.content.includes(tag))

// 0. Activity 1 already used vfiles, but its main.py had an older loader;
//    rebuild it from the same sources so all four programs share one block.
swap(
  isProgram('standing pose only'),
  () => vfiles(FILES.stand),
  'Activity 1 files -> ang.json + main.py (same loader as 2-4)', true,
)

// 1. the three code blocks -> vfiles
swap(
  isProgram('Program 2: WiFi remote'),
  () => { const v = vfiles(FILES.wifi); return v },
  'Activity 2 code -> ang.json + control.html + main.py', true,
)
swap(
  isProgram('Program 3: dance show'),
  () => vfiles(FILES.dance),
  'Activity 3 code -> ang.json + main.py', true,
)
swap(
  isProgram('Program 4: talk to it'),
  () => vfiles(FILES.ai),
  'Activity 4 code -> ang.json + main.py', true,
)

// 2. prose that would otherwise describe the old layout
swap(
  (n) => n.type === 'blockquote' && txt(n).startsWith('One called main.py'),
  () => quote(
    p('Two files, and only two. ', { code: 'ang.json' }, ' holds the twelve angles - the only thing you tune. ', { code: 'main.py' }, ' holds the program that reads them.'),
    p('You only have to create ', { code: 'main.py' }, '. If ', { code: 'ang.json' }, ' is not on the board, the first run writes it with the default angles and prints ', { code: 'wrote ang.json' }, ' so you know it happened. From then on the file is yours: edit it, reset the board, run again.'),
  ),
  'Activity 1: "create new files" note',
)

swap(
  (n) => n.type === 'bulletList' && /^(main\.py|ang\.json)/.test(txt(n)),
  () => ul([
    [{ code: 'ang.json' }, ' The twelve joint angles of the standing pose. Edit this to tune; nothing else needs to change.'],
    [{ code: 'main.py' }, ' The program: read the file, write every joint once, then hold still.'],
  ]),
  'Activity 1: file list',
)

swap(
  (n) => n.type === 'paragraph' && txt(n).startsWith('🔌 Thirty-seven lines'),
  () => p('🔌 Thirty-seven lines, and most of them are numbers. There is no loop body worth speaking of: the program writes all twelve joints once at start-up, then sleeps forever. The numbers themselves come from ', { code: 'ang.json' }, ' - and if that file is not on the board, the program creates it first and prints ', { code: 'wrote ang.json' }, ', so there is always something to open and edit.'),
  'Activity 1: "thirty-seven lines" paragraph',
)

swap(
  (n) => n.type === 'blockquote' && txt(n).startsWith('🧍 One program'),
  () => quote(
    p('🧍 One program, one job: write twelve angles once and let the robot stand. No walking, no dancing, no sensor, no screen - if this one is wrong, nothing after it can be right.'),
    ol([
      [ 'Save ', { code: 'main.py' }, ' to the board and run it. ', { code: 'ang.json' }, ' is written on the first run if it is missing.' ],
      'Hold the robot upright while it boots, then let go and watch which way it falls.',
      [ 'Change one value in ', { code: 'ang.json' }, ', save, reset the board and run again until it holds itself up.' ],
    ]),
  ),
  'Activity 1: intro blockquote',
)

swap(
  (n) => n.type === 'blockquote' && txt(n).startsWith('📱 One program'),
  () => quote(
    p('📱 One program, one job: the robot joins your WiFi and serves a page with eight buttons.'),
    ol([
      'Put your WiFi name and password in WIFI_SSID and WIFI_PASS.',
      [ 'Save ', { code: 'main.py' }, ' and ', { code: 'control.html' }, ' to the board. ', { code: 'ang.json' }, ' is written on the first run if it is missing.'],
      'Run it and copy the IP address printed in the Shell.',
      'Open that address on a phone that is on the same WiFi, then press Forward.',
      [ 'Want a different colour or a different button layout? Edit ', { code: 'control.html' }, ' and reload the page - ', { code: 'main.py' }, ' does not change.' ],
    ]),
  ),
  'Activity 2: how-to blockquote',
)

swap(
  (n) => n.type === 'paragraph' && txt(n).startsWith('🔌 Program 2 is'),
  () => p('🔌 Program 2 is three files: the walking code in ', { code: 'main.py' }, ', the pose in ', { code: 'ang.json' }, ', and the page in ', { code: 'control.html' }, '. The server reads that page off the board when a browser asks for it, which is why you can restyle the buttons without re-uploading a single line of Python.'),
  'Activity 2: "three files" paragraph',
)

swap(
  (n) => n.type === 'paragraph' && txt(n).startsWith('🖱️ The page is plain HTML'),
  () => p('🖱️ ', { code: 'control.html' }, ' is one ordinary HTML file: no framework, no CDN, no internet. Eight buttons, each calling ', { code: "fetch('/go')" }, ' instead of following a link, so the address bar never leaves the robot IP and the page never reloads. The styling is one block of CSS - a dark card, a cross-shaped pad for the four directions, and a status line that says which command was sent.'),
  'Activity 2: control page paragraph',
)

swap(
  (n) => n.type === 'paragraph' && txt(n).startsWith('🧠 Three details'),
  () => p('🧠 Four details make the difference between "works on my desk" and "works with a phone in your hand".'),
  'Activity 2: "four details" lead-in',
)

swap(
  (n) => n.type === 'orderedList' && txt(n).startsWith('Answer before you move'),
  () => ol([
    ['Answer before you move. The server sends the 204 response and closes the socket first, then runs the motion. Otherwise the phone waits four seconds for the reply and the button feels broken.'],
    ['Never block on an idle socket. ', { code: 'settimeout(2)' }, ' and a ', { code: 'try/except' }, ' around ', { code: 'recv' }, ' matter because browsers open a connection early and send nothing.'],
    ['Serve the page from a file. ', { code: "load_page('control.html')" }, ' reads it fresh on every request, and ', { code: 'Cache-Control: no-store' }, ' stops the phone from showing an old copy. If the file is missing the program prints a warning and serves a one-line hint instead of crashing.'],
    ['Always end standing. Every branch calls ', { code: 'stand()' }, ' at the bottom. A robot that stops mid-gait will fall over the next time you press Forward.'],
  ]),
  'Activity 2: server details list',
)

swap(
  (n) => n.type === 'paragraph' && txt(n).startsWith('🔌 Program 4 has no microphone'),
  () => p('🔌 Program 4 has no microphone and no language model. It has a serial port, a table of seven phrases, and six short actions built from one helper.'),
  'Activity 4: program intro (original wording)',
)

swap(
  (n) => n.type === 'blockquote' && txt(n).startsWith('🎭 One program'),
  () => quote(
    p('🎭 One program, one job: seven named moves, arranged into a show.'),
    ol([
      [ 'Save ', { code: 'main.py' }, ' to the board and run it. ', { code: 'ang.json' }, ' is written on the first run if it is missing.' ],
      'Clear one metre around the robot before running it.',
      [ 'Reorder the lines inside ', { code: 'show()' }, ' to make your own performance.' ],
    ]),
  ),
  'Activity 3: how-to blockquote',
)



swap(
  (n) => n.type === 'blockquote' && txt(n).startsWith('🏆 Four programs'),
  () => quote(
    p('🏆 Four programs, four jobs - now make one of them yours.'),
    ul([
      [ 'Add a second pose, ', { code: 'sit.json' }, ', and a way to switch between the two.' ],
      'Add a new button to control.html and a matching branch to the server.',
      [ 'Add a new phrase to ', { code: 'CMDS' }, ' and teach the AI module to say it.' ],
    ]),
  ),
  'Activity 5: challenges blockquote',
)

swap(
  (n) => n.type === 'orderedList' && txt(n).startsWith('A second pose'),
  () => ol([
    ['A second pose. Copy ', { code: 'ang.json' }, ' to ', { code: 'sit.json' }, ', fold the legs and bring the arms forward, then write one function that takes a filename and a number of steps and moves every joint from wherever it is to that pose without jumping. Loading two files with the same function is the start of an animation engine, and it is exactly what Program 3 does by hand.'],
    ['A button that does two things. The page sends one path per button. Add ', { code: '/dance' }, ' to the server, map it to three moves, and add a fifth button labelled Dance to ', { code: 'control.html' }, '. Watch out: the browser will happily send a second request while the first is still running, so decide what should happen.'],
    ['A phrase with a condition. Right now every phrase maps to one action. Make one phrase pick between two actions depending on the robot state you keep in a variable.'],
  ]),
  'Activity 5: challenge list',
)

swap(
  (n) => n.type === 'paragraph' && txt(n).startsWith('🤖 Finished the five goals'),
  () => p('🤖 Finished the five goals? Submit your ', { code: 'ang.json' }, ', your ', { code: 'main.py' }, ' and one short paragraph: which joint number was furthest from the class value on your robot, and how you found it.'),
  'Activity 5: homework paragraph',
)

/* ---------------------------------------------------- normalise（排版约定） */
if (!FILES_ONLY && !ONLY) for (const h of nodes.filter((n) => n.type === 'heading')) {
  if (!h.attrs) h.attrs = { ...PA, level: 3 }
  if (!h.attrs.id) h.attrs.id = nid()
  h.attrs['data-toc-id'] = h.attrs.id
  if (h.content?.[0] && !h.content[0].marks?.some((m) => m.type === 'bold')) {
    h.content[0].marks = [{ type: 'bold' }]
  }
}
// in --files-only / --only mode even the trailing blank line the editor adds stays put
if (!FILES_ONLY && !ONLY) {
  while (nodes.length && nodes[nodes.length - 1].type === 'paragraph' && !txt(nodes[nodes.length - 1])) {
    nodes.pop()
    log.push('  dropped a trailing empty paragraph')
  }
}

/* -------------------------------------------------------------- sanity */
const problems = []
const heads = nodes.filter((n) => n.type === 'heading')
const ids = heads.map((h) => h.attrs?.id)
if (new Set(ids).size !== ids.length) problems.push('duplicate heading ids')
for (const h of heads) {
  if (!h.attrs?.id) problems.push('heading without id: ' + txt(h))
  if (!h.content?.[0]?.marks?.some((m) => m.type === 'bold')) problems.push('heading without bold: ' + txt(h))
}
const warnings = []
for (let i = 0; i < nodes.length; i++) {
  if (nodes[i].type === 'heading' && nodes[i].attrs.level === 2 && /Activity/.test(txt(nodes[i]))) {
    if (nodes[i + 1]?.type !== 'blockquote') warnings.push('no intro blockquote under ' + txt(nodes[i]))
  }
}
for (const tb of nodes.filter((n) => n.type === 'table')) {
  const cols = tb.content[0].content.length
  const bad = tb.content.find((r) => r.content.length !== cols)
  if (bad) problems.push('table with ' + cols + ' header cells but a row of ' + bad.content.length)
}
// every vfiles node must parse and contain what we expect
const vf = nodes.filter((n) => n.type === 'vue' && n.attrs?.type === 'vfiles')
for (const v of vf) {
  let obj
  try {
    obj = JSON.parse(v.attrs.content)
  } catch (e) {
    problems.push('vfiles JSON does not parse: ' + e.message)
    continue
  }
  const files = (obj.items?.[0]?.children) || []
  if (!files.length) problems.push('vfiles without files')
  for (const f of files) {
    if (!f.content?.startsWith('```')) problems.push('file without a code fence: ' + f.label)
    if (f.content.length < 80) problems.push('file suspiciously short: ' + f.label)
    if (f.label.endsWith('.py') && /\t/.test(f.content)) problems.push('tab in ' + f.label)
  }
  const names = files.map((f) => f.label).join(' + ')
  log.push(`  vfiles #${vf.indexOf(v) + 1}: ${names}`)
}
if (!vf.some((v) => v.attrs.content.includes('control.html'))) problems.push('control.html not attached to any vfiles node')
doc.content = nodes
console.log(`chapter ${CH_ID}: ${nodes.length} nodes, ${vf.length} file blocks` + (skipped ? `, ${skipped} skipped` : ''))
console.log(log.join('\n'))
if (warnings.length) console.log('warnings:\n  ' + warnings.join('\n  '))
console.log(problems.length ? 'PROBLEMS:\n  ' + problems.join('\n  ') : 'sanity: ok')

await sql.end()
if (DRY || DIFF) {
  // node-by-node diff against what is live right now, so an edit made in the
  // admin UI after the last upload is never silently overwritten
  const before = baseline
  const brief = (n) => {
    if (!n) return '(none)'
    const tag = n.type === 'heading' ? 'h' + n.attrs.level : n.type === 'vue' ? 'vue:' + n.attrs.type : n.type
    if (n.type === 'vue' && n.attrs?.type === 'vfiles') {
      return tag + ' [' + JSON.parse(n.attrs.content).items[0].children.map((f) => f.label).join('+') + ']'
    }
    return tag + ' ' + String(txt(n)).replace(/\s+/g, ' ').slice(0, 58)
  }
  const max = Math.max(before.length, nodes.length)
  let changed = 0
  for (let i = 0; i < max; i++) {
    const a = before[i], b = nodes[i]
    if (JSON.stringify(a) === JSON.stringify(b)) continue
    changed++
    console.log(`  node ${String(i).padStart(3)} CHANGED`)
    console.log(`      was: ${brief(a)}`)
    console.log(`      now: ${brief(b)}`)
  }
  console.log(`\nnodes: ${before.length} -> ${nodes.length} | changed: ${changed}`)
  console.log(DRY ? '--dry: nothing sent' : '--diff: nothing sent')
  process.exit(problems.length ? 1 : 0)
}
if (problems.length) {
  console.error('\nrefusing to upload while the sanity check fails')
  process.exit(1)
}

/* -------------------------------------------------------------- upload */
const login = await fetch(`${BASE}/api/auth/login`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ username: USER, password: PASS }),
})
const cookie = (login.headers.getSetCookie?.() || []).map((c) => c.split(';')[0]).join('; ')
if (!login.ok || !cookie) {
  console.error('login failed:', login.status, await login.text().catch(() => ''))
  process.exit(1)
}
const res = await fetch(`${BASE}/api/chapters/update`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json', Cookie: cookie },
  body: JSON.stringify({ id: CH_ID, content: doc }),
})
const body = await res.text()
console.log('\nupdate:', res.status, body.slice(0, 200))
if (!res.ok) process.exit(1)

/* -------------------------------------------------------------- verify */
const back = await fetch(`${BASE}/api/chapters/show?id=${CH_ID}`, { headers: { Cookie: cookie } })
const data = await back.json()
const ch = data?.data?.chapter ?? data?.chapter ?? data?.data ?? data
const saved = ch.content?.content || []
const savedVf = saved.filter((n) => n.type === 'vue' && n.attrs?.type === 'vfiles')
console.log(`saved: ${saved.length} nodes, ${savedVf.length} vfiles blocks`)
savedVf.forEach((v, i) => {
  const files = JSON.parse(v.attrs.content).items[0].children
  console.log(`  block ${i + 1}: ` + files.map((f) => `${f.label} (${f.content.length}B)`).join(', '))
})
const leftover = saved.filter((n) => n.type === 'codeBlock' && txt(n).includes('Biped robot - Program'))
console.log('old single-file code blocks left:', leftover.length)
console.log(`page: ${BASE}/course/7/${CH_ID}`)
