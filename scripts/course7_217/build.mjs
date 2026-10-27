/**
 * Rebuild chapter 217 "Robot Programming" (course 7) from the four .py files
 * in this folder, using the concise program-per-activity layout.
 *
 * Usage:
 *   node build.mjs --dry     # build and dump 217.json, do not touch the LMS
 *   node build.mjs           # build and POST to /api/chapters/update
 */
import { readFileSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const HERE = dirname(fileURLToPath(import.meta.url))
const BASE = process.env.LMS || 'http://10.28.1.151'
const USER = process.env.LMS_USER || 'admin'
const PASS = process.env.LMS_PASS || 'REDACTED'
const DRY = process.argv.includes('--dry')
const CH_ID = 217

/* ------------------------------------------------------------------ nodes */
const PA = { indent: null, margin: null, wordWrap: 'normal', textAlign: null, indentUnit: null, lineHeight: 1.75 }
let uid = 0
const nid = () => 'p' + (uid++).toString(36) + Math.random().toString(36).slice(2, 6)
const t = (text, marks) => ({ type: 'text', text, ...(marks ? { marks } : {}) })
const B = (s) => ({ bold: s })
const C = (s) => ({ code: s })

const seg = (s) => {
  if (typeof s === 'string') return t(s)
  if (s.code !== undefined) return t(s.code, [{ type: 'code' }])
  return t(s.bold, [{ type: 'bold' }])
}
const p = (...segs) => ({ type: 'paragraph', attrs: { ...PA }, content: segs.map(seg) })
const h2 = (text) => ({ type: 'heading', attrs: { id: nid(), level: 2, ...PA, 'data-toc-id': null }, content: [t(text, [{ type: 'bold' }])] })
const h3 = (text) => ({ type: 'heading', attrs: { id: nid(), level: 3, ...PA, 'data-toc-id': null }, content: [t(text, [{ type: 'bold' }])] })
const quote = (...blocks) => ({ type: 'blockquote', content: blocks })
const ol = (items) => ({
  type: 'orderedList', attrs: { type: null, start: 1, margin: null, listType: 'decimal' },
  content: items.map((it) => ({ type: 'listItem', attrs: { indent: null, indentUnit: null }, content: [p(...(Array.isArray(it) ? it : [it]))] })),
})
const ul = (items) => ({
  type: 'bulletList', attrs: { type: null, margin: null, listType: 'disc' },
  content: items.map((it) => ({ type: 'listItem', attrs: { indent: null, indentUnit: null }, content: [p(...(Array.isArray(it) ? it : [it]))] })),
})
const code = (text, language = 'python') => ({ type: 'codeBlock', attrs: { language }, content: [t(text)] })
const call = (icon, ...segs) => ({
  type: 'callout', attrs: { icon, type: 'primary', margin: null, backgroundColor: 'rgb(217, 231, 255)' },
  content: [p(...segs)],
})
const cell = (s, header) => ({
  type: header ? 'tableHeader' : 'tableCell',
  attrs: { align: null, color: null, colspan: 1, rowspan: 1, colwidth: null, background: header ? 'rgb(242,243,245)' : null },
  content: [p(...(Array.isArray(s) ? s : [s]))],
})
const table = (head, rows) => ({
  type: 'table', attrs: { margin: null },
  content: [
    { type: 'tableRow', content: head.map((h) => cell(h, true)) },
    ...rows.map((r) => ({ type: 'tableRow', content: r.map((c) => cell(c, false)) })),
  ],
})
const vue = (type, cid) => ({ type: 'vue', attrs: { type, height: null, content: String(cid) } })

/* ------------------------------------------------------------------- code */
const py = (name) => readFileSync(join(HERE, name), 'utf8').trimEnd()

/* ------------------------------------------------------------------ build */
const nodes = [
  // ---------- whole-chapter intro
  quote(
    p('📘 ', B('Robot Programming: four programs, one robot.'), ' Each program does exactly one job, and each one is short enough to read in a sitting. You start by finding the twelve numbers that make your robot stand up straight, then teach it to walk from your phone, then to dance, and finally to obey your voice.'),
    ol([
      'Program 1 - pose tester: find the standing angle of every joint.',
      'Program 2 - WiFi remote: walk and act from a phone browser.',
      'Program 3 - dance show: arrange named moves into a performance.',
      'Program 4 - talk to it: the AI module sends a phrase over UART, the robot acts.',
      'Extra - add your own pose, your own button and your own voice command.',
    ]),
  ),

  h2('🎯 Learning Objectives'),
  ol([
    'Drive all twelve servos from one dictionary and explain why a 50 Hz PWM duty value turns into a servo angle.',
    'Find your own robot\'s standing numbers by testing one joint at a time instead of guessing.',
    'Serve a web page from the ESP32 and walk the robot by tapping buttons on a phone.',
    'Arrange named moves into a dance show by editing a single function.',
    'Read a phrase from an AI module over UART and run the matching action.',
    '(Extra) Add one new pose, one new web button and one new voice command of your own.',
  ]),

  h3('📖 Glossary'),
  table(
    ['Term', 'Definition'],
    [
      [[B('Servo')], 'A motor with built-in feedback that holds a commanded angle, usually 0-180 degrees, driven by a pulse every 20 ms.'],
      [[B('PWM duty')], 'The width of the pulse inside each 20 ms period. On the ESP32 duty runs 0-1023, so 26 is 0 deg and 127 is 180 deg.'],
      [[B('Calibration')], 'The set of twelve angles that makes one particular robot stand straight - every robot has its own.'],
      [[B('Pose')], 'A complete assignment of angles to all twelve joints; standing, bowing and squatting are all poses.'],
      [[B('Gait')], 'A repeating pattern of leg movements that moves the body forward without falling over.'],
      [[B('UART')], 'A two-wire serial link (TX to RX, plus GND) that carries plain text between the AI module and the ESP32.'],
    ],
  ),

  // ---------- Activity 1
  h2('🧪 Activity 1 The Pose Tester'),
  quote(
    p('🦿 One program, one job: find the twelve numbers that make your robot stand up straight.'),
    ol([
      'Paste ', C('pose.py'), ' into Thonny and save it to the robot as ', C('main.py'), '.',
      'Watch which joint looks wrong, then change only that number in the ANG table.',
      'Press Ctrl-C to stop the loop and type ', C("w('knee_l', 150)"), ' to test one joint by hand.',
    ]),
  ),
  h3('📋 Copy → Paste → Run'),
  p('🔌 Program 1 is about 100 lines: a table of twelve angles, a table of twelve pins, one three-line helper and three test poses. Nothing else - no WiFi, no dancing, no OLED.'),
  code(py('pose.py')),

  h3('🦿 Twelve Joints, One Dictionary'),
  p('🧩 The old version of this program declared twelve separate objects, ', C('servo0'), ' to ', C('servo11'), ', and kept their calibration in twelve variables called ', C('angleC0'), ' to ', C('angleC11'), '. It works, but nothing in the code tells you which number belongs to which leg.'),
  p('📚 Here the wiring is one dictionary and the calibration is another, both keyed by a name you can read: ', C('hip_r'), ', ', C('knee_l'), ', ', C('hand_r'), '. The whole servo driver becomes twelve characters long, because the pin and the angle now live in the same place they are looked up.'),
  p('⚙️ The one line worth memorising is the duty conversion. A servo wants a 0.5 ms pulse for 0 degrees and 2.5 ms for 180 degrees, out of a 20 ms period. At 50 Hz the ESP32\'s ', C('duty()'), ' spans 0-1023 across those 20 ms, so 0.5 ms is 26 counts and 2.5 ms is 127 counts. Straight-line between them: ', C('duty = deg * 0.56 + 25'), '. If you ever change the PWM frequency, this constant changes with it.'),

  h3('🎚️ Finding Your Robot\'s Numbers'),
  p('🧪 The three test poses are deliberately chosen to isolate different groups. ', B('t_pose'), ' moves only the shoulders, so if one arm is off you know which number to touch. ', B('squat'), ' moves hips, knees and ankles together, which exposes a leg that is one number away from straight. ', B('wave'), ' moves a single joint through a range, so you can see where it starts buzzing at the end stop.'),
  ol([
    ['Run the program and let it cycle: T-pose, squat, wave, stand.'],
    ['For each pose, note the joint that is wrong. Do not touch a joint that is already right.'],
    ['Change that one number by 5 degrees, save, and let the program restart. Repeat until it looks symmetric.'],
    ['Only then adjust ', C('LEAN'), ' - it tilts both hips forward so the robot stops falling backwards when it walks.'],
  ]),
  call('💡', '🔍 The signs are not a bug: on the right side a bigger angle lifts the limb, on the left side a smaller angle does. That is why every left joint is written as ', B('ANG - something'), ' and every right joint as ', B('ANG + something'), '. Once you notice the mirror, the whole file becomes readable.'),

  // ---------- Activity 2
  h2('🧪 Activity 2 WiFi Remote'),
  quote(
    p('📱 One program, one job: the robot joins your WiFi and serves a page with eight buttons.'),
    ol([
      'Put your WiFi name and password in ', C('WIFI_SSID'), ' and ', C('WIFI_PASS'), '.',
      'Run it and copy the IP address printed in the Shell.',
      'Open that address on a phone that is on the same WiFi, then press Forward.',
    ]),
  ),
  h3('📋 Copy → Paste → Run'),
  p('🔌 Program 2 is the walking code plus a forty-line web server. The page is a single string, the server is one ', C('while True'), ' loop that answers one request at a time.'),
  code(py('wifi.py')),

  h3('🌐 The Control Page'),
  p('🖱️ The page is plain HTML with eight buttons. Each one calls ', C("fetch('/go')"), ' instead of following a link, which is why the address bar never leaves the robot\'s IP and the page never reloads - a reload would take a second and a half on a phone, and you would lose the "press and press again" feel.'),
  table(
    ['Button', 'Path', 'Function', 'What it does'],
    [
      ['Forward', [C('/go')], [C('goahead()')], 'five full gait cycles, about one metre'],
      ['Back', [C('/back')], [C('goback()')], 'five cycles backwards'],
      ['Left / Right', [C('/left')], [C('/right')], 'five small turns in place, one step of the shuffle each'],
      ['Punch', [C('/punch')], [C('punch()')], 'crouch, raise both fists, throw five punches'],
      ['Kick', [C('/kick')], [C('kick()')], 'lean, wind up the right leg, kick'],
      ['Push-up', [C('/pushup')], [C('pushup()')], 'lie down, three push-ups, stand up'],
      ['Reset', [C('/reset')], [C('stand(True)')], 're-drive the standing pose from scratch'],
    ],
  ),

  h3('📱 How the Server Works'),
  p('🧠 Three details make the difference between "works on my desk" and "works with a phone in your hand".'),
  ol([
    [B('Answer before you move.'), ' The server sends the 204 response and closes the socket ', B('first'), ', then runs the motion. Otherwise the phone waits four seconds for the reply and the button feels broken.'],
    [B('Never block on an idle socket.'), ' ', C('settimeout(2)'), ' and a try/except around ', C('recv'), ' matter because browsers open a connection early and send nothing.'],
    [B('Always end standing.'), ' Every branch calls ', C('stand()'), ' at the bottom. A robot that stops mid-gait will fall over the next time you press Forward.'],
  ]),
  call('⚠️', '🌐 The robot is not on the internet - it is only on the local WiFi. If the phone shows a blank page, check that it is on the same network (not 4G) and that the IP address still matches the one in the Shell; a DHCP lease change silently breaks old bookmarks.'),

  // ---------- Activity 3
  h2('🧪 Activity 3 Dance Show'),
  quote(
    p('🎭 One program, one job: seven named moves, arranged into a show.'),
    ol([
      'Paste ', C('dance.py'), ' into Thonny and save it as ', C('main.py'), '.',
      'Clear one metre around the robot before running it.',
      'Reorder the lines inside ', C('show()'), ' to make your own performance.',
    ]),
  ),
  h3('📋 Copy → Paste → Run'),
  p('🔌 Program 3 has no WiFi and no AI. All it has is moves and a running order - about the same length as Program 2, but every line is a movement instead of a network call.'),
  code(py('dance.py')),

  h3('🎭 Every Move Is a Loop'),
  p('🎼 Look at any move and you will see the same three lines repeated with different joints. A counter ', C('a'), ' walks from 0 to 13, and every joint is written as ', C('base + k * a'), '. The base is the standing angle, and ', C('k'), ' decides how far that joint travels during the move. Change ', C('k'), ' from 2 to 4 and the arm swings twice as far; change the loop length from 14 to 28 and it swings twice as slowly.'),
  table(
    ['Move', 'Joints that move', 'What it looks like'],
    [
      [[C('nod')], 'right ankle', 'toe taps the floor twice'],
      [[C('twist')], 'both ankles, one shoulder, one arm', 'hips sway left then right, arms alternate'],
      [[C('flap')], 'both shoulders, both arms, both hands', 'arms open and close like wings'],
      [[C('toe_tap')], 'right ankle on top of both shoulders', 'toe taps while the arms are held up'],
      [[C('peacock')], 'hips, knees, both arms, both hands', 'deep squat while the arms open and close like a fan'],
      [[C('lotus')], 'both arms, both hands, no legs', 'hands trace a slow circle in the air'],
      [[C('bow')], 'hips, knees, one shoulder, one hand', 'folds forward from the waist and comes back'],
    ],
  ),
  p('⚖️ The ', B('peacock'), ' move is the only one written with a helper, ', C('fan(base, step, open_arm)'), '. The reason is physical, not stylistic: the hips travel 0 to 80 and back, and writing that as eight separate loops would hide the fact that it is one continuous squat. The helper takes the starting angle and a direction, so the eight calls read like the eight slices they are.'),

  h3('🎬 Chaining the Show'),
  p('🎬 ', C('show()'), ' is the choreography, and it is deliberately boring: one function call per line, repeats written out. If you want the robot to bow twice at the end, copy the line. There is no scheduler and no data structure, because a dance is a list of things to do in order, and a list of function calls already is one.'),
  call('🎯', '⏱️ Timing is the whole performance. A move looks right when the loop is 14 frames at 17 ms (about a quarter second per half cycle). If you make a move longer, also make the delay smaller, or the robot will look like it is moving through honey.'),

  // ---------- Activity 4
  h2('🧪 Activity 4 Talk to It'),
  quote(
    p('🎤 One program, one job: read a phrase from the AI module and run the matching action.'),
    ol([
      'Wire the AI module to UART2: its TX to GPIO16, its RX to GPIO17, common GND.',
      'Paste ', C('ai.py'), ' into Thonny and save it as ', C('main.py'), '.',
      'Paste the prompt from the next section into the AI module, then say "挥挥手".',
    ]),
  ),
  h3('📋 Copy → Paste → Run'),
  p('🔌 Program 4 has no microphone and no language model. It has a serial port, a table of seven phrases, and six short actions built from one helper.'),
  code(py('ai.py')),

  h3('🎤 Teaching the AI Module Its Lines'),
  p('🗣️ The AI module cannot guess what to send, so you tell it. Open its configuration and give it this instruction - the phrases must match the left column of the table exactly, including the two characters 好的 in front.'),
  code([
    'You control a small biped robot. When I ask you to do something,',
    'answer with exactly one of these phrases and nothing else:',
    '  挥挥手 -> "好的挥手"',
    '  鞠个躬 -> "好的鞠躬"',
    '  踢球   -> "好的踢球"',
    '  打一拳 -> "好的打拳"',
    '  蹲下   -> "好的蹲下"',
    '  跳个舞 -> "好的跳舞"',
    '  站起来 -> "好的起立"',
    'If I ask for anything else, answer "好的起立".',
  ].join('\n'), 'text'),
  table(
    ['You say', 'The AI module sends', 'The robot runs'],
    [
      ['挥挥手', [C('好的挥手')], [C('wave()')]],
      ['鞠个躬', [C('好的鞠躬')], [C('bow()')]],
      ['踢球', [C('好的踢球')], [C('kick()')]],
      ['打一拳', [C('好的打拳')], [C('punch()')]],
      ['蹲下', [C('好的蹲下')], [C('squat()')]],
      ['跳个舞', [C('好的跳舞')], [C('dance()')]],
      ['站起来', [C('好的起立')], [C('stand()')]],
    ],
  ),

  h3('🧠 Where the Intelligence Actually Lives'),
  p('🧩 It is worth being precise about this, because it is the most misunderstood part of the project. The speech recognition, the language model and the reasoning all run on the ', B('AI module'), '. What reaches the ESP32 is a short string over two wires. The ESP32 does not know what a word means; it only knows that ', C('if key in line'), ' matched.'),
  p('🧠 That is why the program is so short, and also why it is reliable: the boundary is text. You can swap the AI module for a phone app, a laptop script or another robot and the ESP32 side does not change at all. The only contract is "send me one of these seven phrases".'),
  call('✅', '📷 The module also has a camera. Ask it "what is in front of you" and it answers in speech - that part needs no code on the robot, because the answer never leaves the module. The robot\'s job in that conversation is the face on the OLED, not the description.'),
  p('🚶 ', B('There is no "walk forward" command in Program 4 on purpose.'), ' The gait is a hundred lines of carefully timed limb movement, and it already lives in Program 2. If you want voice walking, copy ', C('goahead()'), ' and ', C('goback()'), ' across and add ', C("('前进', 'happy', goahead)"), ' to ', C('CMDS'), '. That is composition rather than duplication - and it is exactly what the Extra activity asks you to try.'),

  // ---------- Activity 5 (Extra)
  h2('🧪 Activity 5 (Extra) Make It Yours'),
  quote(
    p('🏆 Four programs, four jobs - now make one of them yours.'),
    ol([
      'Add a new pose to ', C('pose.py'), ' and a matching move to ', C('dance.py'), '.',
      'Add a new button to the web page and a matching branch to the server.',
      'Add a new phrase to ', C('CMDS'), ' and teach the AI module to say it.',
    ]),
  ),
  h3('✏️ Three Challenges'),
  ol([
    [B('A pose nobody taught you.'), ' Write a function in Program 1 that puts both hands above the head (hint: shoulder + 140, arm - 40 on the right, mirrored on the left). Get it to look symmetric, then turn it into a dance move by changing the constant angles into a loop.'],
    [B('A button that does two things.'), ' The page only sends one path per button. Add ', C("/dance"), ' to the server, map it to three moves, and add a fifth button labelled Dance. Watch out: the browser will happily send a second request while the first is still running, so decide what should happen.'],
    [B('A phrase with a condition.'), ' Right now every phrase maps to one action. Add a command that behaves differently depending on what the robot just did - for example "再来一次" repeats the last action. You will need one variable to remember it, and you will discover why stateless commands were easier.'],
  ]),

  h3('📤 Submit your homework'),
  p('🤖 Finished the five goals? Submit your programming file plus one short paragraph: which joint number was furthest from the class value on your robot, and how you found it.'),
  vue('homework', 12),

  h3('💬 Share your idea'),
  p('💬 Post the move you invented - the name, which joints it uses, and what it looks like when it goes wrong. The failures are usually more instructive than the successes.'),
  vue('comment', 272),
]

/* ------------------------------------------------------- normalise headings */
for (const n of nodes) {
  if (n.type === 'heading') {
    n.attrs['data-toc-id'] = n.attrs.id
    if (!n.content[0].marks) n.content[0].marks = [{ type: 'bold' }]
  }
}

const doc = { type: 'doc', content: nodes }

/* --------------------------------------------------------------- sanity check */
const acts = nodes.filter((n) => n.type === 'heading' && n.attrs.level === 2 && /Activity/.test(n.content[0].text))
const ids = nodes.filter((n) => n.type === 'heading').map((n) => n.attrs.id)
const problems = []
if (nodes[0].type !== 'blockquote') problems.push('content[0] is not the whole-chapter blockquote')
if (new Set(ids).size !== ids.length) problems.push('duplicate heading id')
for (const h of nodes.filter((n) => n.type === 'heading')) {
  if (!h.content[0].marks?.some((m) => m.type === 'bold')) problems.push('heading without bold: ' + h.content[0].text)
}
for (let i = 0; i < nodes.length; i++) {
  if (nodes[i].type === 'heading' && nodes[i].attrs.level === 2 && /Activity/.test(nodes[i].content[0].text)) {
    if (nodes[i + 1]?.type !== 'blockquote') problems.push('no blockquote right under ' + nodes[i].content[0].text)
  }
}
const last = nodes[nodes.length - 1]
if (last.type === 'paragraph') problems.push('trailing empty paragraph at the end')
const words = JSON.stringify(doc).length
console.log(`activities: ${acts.length}`)
acts.forEach((a) => console.log('  ' + a.content[0].text))
console.log(`nodes: ${nodes.length}, json ${(words / 1024).toFixed(1)} KB, code blocks: ${nodes.filter((n) => n.type === 'codeBlock').length}`)
console.log(problems.length ? 'PROBLEMS:\n  ' + problems.join('\n  ') : 'sanity: ok')

writeFileSync(join(HERE, '217.json'), JSON.stringify(doc, null, 2))

if (DRY) {
  console.log('\n--dry: 217.json written, nothing sent')
  process.exit(problems.length ? 1 : 0)
}
if (problems.length) {
  console.error('\nrefusing to upload while sanity check fails')
  process.exit(1)
}

/* -------------------------------------------------------------------- upload */
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
console.log('logged in')

const res = await fetch(`${BASE}/api/chapters/update`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json', Cookie: cookie },
  body: JSON.stringify({ id: CH_ID, content: doc }),
})
const body = await res.text()
console.log('update:', res.status, body.slice(0, 300))
if (!res.ok) process.exit(1)

/* -------------------------------------------------------------------- verify */
const back = await fetch(`${BASE}/api/chapters/show?id=${CH_ID}`, { headers: { Cookie: cookie } })
const data = await back.json()
const ch = data?.data?.chapter ?? data?.chapter ?? data?.data ?? data
const got = (ch.content?.content || []).filter((n) => n.type === 'heading').map((n) => `${n.attrs.level}:${n.content[0].text}`)
console.log(`\nsaved chapter ${ch.id} "${ch.title || ch.name}" - ${got.length} headings:`)
got.forEach((g) => console.log('  ' + g))
