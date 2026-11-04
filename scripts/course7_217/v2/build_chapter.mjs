/**
 * Rebuild chapter 217 (course 7, "Robot Programming") around the four
 * programs, with tables instead of prose.
 *
 *   Activity 1  tune the servos, stand up
 *   Activity 2  drive it over WiFi
 *   Activity 3  let it dance
 *   Activity 4  command it with an AI module
 *
 * Everything that is content rather than prose is carried over untouched:
 * the 14 screenshots, the four vfiles blocks, the prompt code block, the
 * phrase table, and the homework / comment widgets. Only the wording around
 * them is rewritten.
 *
 *   node build_chapter.mjs --dry    # print the plan, write nothing
 *   node build_chapter.mjs          # upload
 */
import postgres from '/Users/oldmoon/Documents/ubuntu/nuxt_lms_2026/node_modules/postgres/src/index.js'

const BASE = process.env.LMS || 'http://10.28.1.151'
const USER = process.env.LMS_USER || 'admin'
if (!process.env.LMS_PASS) throw new Error('请设置 LMS_PASS 环境变量（LMS 管理员密码）')
const PASS = process.env.LMS_PASS
const DRY = process.argv.includes('--dry')

/* ------------------------------------------------------------------ nodes */
const PA = { indent: null, margin: null, wordWrap: 'normal', textAlign: null, indentUnit: null, lineHeight: 1.75 }
let uid = 0
const nid = () => 'a' + (uid++).toString(36) + Math.random().toString(36).slice(2, 5)
const t = (text, marks) => ({ type: 'text', text, ...(marks ? { marks } : {}) })
const seg = (s) =>
  typeof s === 'string' ? t(s)
  : s.code !== undefined ? t(s.code, [{ type: 'code' }])
  : s.bold !== undefined ? t(s.bold, [{ type: 'bold' }])
  : t(s.text)
const p = (...segs) => ({ type: 'paragraph', attrs: { ...PA }, content: segs.map(seg) })
const clean = (arr) => arr.filter((x) => x !== undefined && x !== null)

const ul = (items) => ({
  type: 'bulletList', attrs: { type: null, margin: null, listType: 'disc' },
  content: items.map((it) => ({ type: 'listItem', attrs: { indent: null, indentUnit: null }, content: [Array.isArray(it) ? p(...it) : p(it)] })),
})
const ol = (items) => ({
  type: 'orderedList', attrs: { type: null, start: 1, margin: null, listType: 'decimal' },
  content: items.map((it) => ({ type: 'listItem', attrs: { indent: null, indentUnit: null }, content: [Array.isArray(it) ? p(...it) : p(it)] })),
})
const quote = (...blocks) => ({ type: 'blockquote', content: clean(blocks) })
const h2 = (text) => {
  const id = nid()
  return { type: 'heading', attrs: { id, level: 2, ...PA, 'data-toc-id': id }, content: [t(text, [{ type: 'bold' }])] }
}
const h3 = (text) => {
  const id = nid()
  return { type: 'heading', attrs: { id, level: 3, ...PA, 'data-toc-id': id }, content: [t(text, [{ type: 'bold' }])] }
}
const callout = (icon, text, color = 'rgb(217, 231, 255)') => ({
  type: 'callout', attrs: { icon, type: 'primary', margin: null, backgroundColor: color },
  content: [Array.isArray(text) ? p(...text) : p(text)],
})

const HDR = { align: null, color: null, colspan: 1, rowspan: 1, colwidth: null, background: 'rgb(242,243,245)' }
const CELL = { align: null, color: null, colspan: 1, rowspan: 1, colwidth: null, background: null }
const cell = (node, kind) => ({
  type: kind, attrs: { ...(kind === 'tableHeader' ? HDR : CELL) },
  content: [Array.isArray(node) ? p(...node) : p(node)],
})
const table = (headers, rows) => ({
  type: 'table', attrs: { margin: null },
  content: [
    { type: 'tableRow', content: headers.map((h) => cell(h, 'tableHeader')) },
    ...rows.map((r) => ({ type: 'tableRow', content: r.map((c) => cell(c, 'tableCell')) })),
  ],
})
const code = (text, lang = 'python') => ({ type: 'codeBlock', attrs: { language: lang }, content: [t(text)] })

/* ------------------------------------------------------- carry-over nodes */
const sql = postgres(process.env.PG, { idle_timeout: 10, max: 1 })
const row = (await sql`select content from chapters where id = 217`)[0]
const old = row.content.content
const txt = (n) => (!n || typeof n !== 'object' ? '' : n.type === 'text' ? n.text || '' : Array.isArray(n.content) ? n.content.map(txt).join('') : '')

const srcOf = (n) => (n.type === 'image' && n.attrs ? decodeURIComponent(n.attrs.src || '') : '')
const image = (key) => {
  const hit = old.find((n) => srcOf(n).includes(key))
  if (!hit) throw new Error('image not found: ' + key)
  return JSON.parse(JSON.stringify(hit))
}
const vfilesOf = (marker) => {
  const hit = old.find((n) => n.type === 'vue' && n.attrs?.type === 'vfiles' && n.attrs.content.includes(marker))
  if (!hit) throw new Error('vfiles not found: ' + marker)
  return JSON.parse(JSON.stringify(hit))
}
const widget = (type) => {
  const hit = old.find((n) => n.type === 'vue' && n.attrs?.type === type)
  if (!hit) throw new Error('widget not found: ' + type)
  return JSON.parse(JSON.stringify(hit))
}
const promptBlock = () => {
  const hit = old.find((n) => n.type === 'codeBlock' && txt(n).includes('You control a small biped robot'))
  if (!hit) throw new Error('prompt block not found')
  return JSON.parse(JSON.stringify(hit))
}

// the twelve joints, straight from the shipped ang.json + PINS
const PINS = [['leg_r', 14, 30], ['knee_r', 13, 54], ['ankle_r', 12, 91],
  ['leg_l', 5, 150], ['knee_l', 4, 142], ['ankle_l', 2, 95],
  ['shoulder_r', 15, 32], ['arm_r', 25, 144], ['hand_r', 26, 40],
  ['shoulder_l', 27, 150], ['arm_l', 32, 37], ['hand_l', 33, 130]]

const SHOW_CODE = `def show():
    stand()
    nod();     nod()
    twist();   twist()
    flap()
    toe_tap(); toe_tap(); toe_tap(); toe_tap()
    peacock()
    lotus();   lotus()
    bow()
    stand()`

const n = []

/* ------------------------------------------------------------ chapter head */
n.push(quote(
  p('📘 Robot Programming: one board, one robot, four programs.'),
  ul([
    [ { bold: 'Program 1' }, ' - tune twelve servos until the robot stands up on its own.' ],
    [ { bold: 'Program 2' }, ' - drive it from a phone on the same WiFi.' ],
    [ { bold: 'Program 3' }, ' - let it dance a show you can reorder in one function.' ],
    [ { bold: 'Program 4' }, ' - say a phrase and let an AI module pick the move.' ],
  ]),
  p('All four read the same ', { code: 'ang.json' }, ', so you calibrate once and every later program inherits the pose.'),
))

n.push(h2('🎯 Learning Objectives'))
n.push(ol([
  [ 'Tune twelve angles in ', { code: 'ang.json' }, ' until the robot stands without help.' ],
  'Serve a control page from the ESP32 and drive the robot from a phone on the same WiFi.',
  [ 'Chain seven named moves into a show by editing ', { code: 'show()' }, '.' ],
  'Read one line of text from an AI module over UART and run the matching action.',
]))

n.push(h3('📖 Glossary'))
n.push(table(['Term', 'Definition'], [
  ['Servo', 'A motor with built-in feedback that holds a commanded angle, usually 0-180 degrees, driven by a pulse every 20 ms.'],
  ['PWM duty', 'The width of the pulse inside each 20 ms period. On the ESP32 duty runs 0-1023, so 26 is 0 deg and 127 is 180 deg.'],
  ['Calibration', 'The twelve angles that make one particular robot stand straight - every robot has its own.'],
  ['Pose', 'A complete assignment of angles to all twelve joints; standing is one pose, bowing is another.'],
  ['Gait', 'A repeating pattern of leg movements that moves the body forward without falling.'],
  ['UART', 'A two-wire serial link (TX to RX, plus GND) that carries plain text between the AI module and the ESP32.'],
]))

/* ------------------------------------------------------------ ACTIVITY 1 */
n.push(h2('🧪 Activity 1  Tune the Servos, Stand Up'))
n.push(quote(
  p('🧍 One job: twelve angles that keep the robot upright. This is the only program you tune - the other three reuse the file you produce here.'),
  ol([
    'Set up the board: install MicroPython, connect it, make the project folder.',
    [ 'Put ', { code: 'ang.json' }, ' and ', { code: 'main.py' }, ' on the board and run it.' ],
    [ 'Edit one number in ', { code: 'ang.json' }, ' at a time until it stands.' ],
  ]),
))

n.push(h3('1️⃣ Set Up the Board'))
n.push(table(['You need', 'Detail'], [
  ['ESP32 board', 'any 30-pin dev board with 12 free PWM-capable pins'],
  ['12 servos', '6 for the legs, 6 for the arms, on a separate 6 V supply'],
  ['USB cable', 'a data cable - charge-only cables give no serial port'],
  ['MicroPython', 'flashed to the board, 1.19 or newer'],
  ['PyCharm', 'with the MicroPython Tools plugin'],
]))

n.push(p({ bold: 'Open PyCharm.' }, ' Any recent version works; the plugin does the talking to the board.'))
n.push(image('189/69.webp'))

n.push(p({ bold: 'Add MicroPython Tools.' }, ' It gives you a file tree on the board and a REPL in the IDE.'))
n.push(image('266/2c706b22'))
n.push(image('266/b22125c8'))

n.push(p({ bold: 'Flash MicroPython.' }, ' Download the .bin for your board from micropython.org and flash it with the tool.'))
n.push(image('265/9e2e45e5'))
n.push(image('306/1cc24221'))

n.push(p({ bold: 'Connect the board.' }, ' Pick the serial port; the Shell should show a >>> prompt.'))
n.push(image('265/afd01d4b'))

n.push(p({ bold: 'Make a project folder.' }, ' Two files go in it, and nothing else.'))
n.push(image('265/a67dd8d4'))
n.push(image('270/5c9ca2c9'))

n.push(h3('2️⃣ The Two Files'))
n.push(table(['File', 'What it holds', 'Do you edit it?'], [
  [{ code: 'ang.json' }, 'the twelve standing angles', 'yes - this is the whole exercise'],
  [{ code: 'main.py' }, 'reads the file, writes every joint once, then holds', 'no'],
]))
n.push(vfilesOf('standing pose only'))
n.push(p('You only have to create ', { code: 'main.py' }, '. If ', { code: 'ang.json' }, ' is missing, the first run writes it with the default angles and prints ', { code: 'wrote ang.json' }, '.'))

n.push(h3('3️⃣ One Table for Twelve Joints'))
n.push(table(['Joint', 'GPIO', 'Standing angle'], PINS.map(([j, pin, deg]) => [{ code: j }, String(pin), String(deg)])))
n.push(p('A servo wants a 0.5 ms pulse at 0 deg and 2.5 ms at 180 deg inside a 20 ms period. At 50 Hz the ESP32 duty range is 0-1023, so ', { code: 'duty = degrees * 0.56 + 25' }, '. That is the only arithmetic in the file.'))
n.push(p('The two sides mirror: ', { code: 'leg_r' }, ' 30 against ', { code: 'leg_l' }, ' 150, ', { code: 'knee_r' }, ' 54 against ', { code: 'knee_l' }, ' 142. Same servo, mounted the other way round.'))

n.push(h3('4️⃣ Tune It by Eye'))
n.push(p('Power on, hold the robot for a second, let go. If it stays up, the table is right. If it falls, find the row below.'))
n.push(table(['What you see', 'Which joint', 'Which way to move it'], [
  ['falls forward', 'leg_r + leg_l', 'leg_r down 2, leg_l up 2 - the body leans back'],
  ['falls backward', 'leg_r + leg_l', 'leg_r up 2, leg_l down 2 - the body leans forward'],
  ['falls to the right', 'ankle_r + ankle_l', 'raise both ankles 3'],
  ['falls to the left', 'ankle_r + ankle_l', 'lower both ankles 3'],
  ['one shoulder hangs lower', 'shoulder_r / shoulder_l', 'move the low one up 3'],
  ['a joint buzzes or gets warm', 'that one joint', 'move it 5 back toward the middle of its range'],
]))
n.push(ul([
  'One row at a time. Two numbers changed together tells you nothing.',
  'Two or three degrees is a visible change on this robot; one degree usually is not.',
  'If a change makes the fall worse, go the other way on that joint - the sign depends on how the horn was mounted.',
]))
n.push(callout('🔍', ['The left side is the mirror of the right, and the numbers show it: ', { code: 'leg_r' }, ' 30 against ', { code: 'leg_l' }, ' 150 is almost exactly 180 minus. Write down the twelve numbers when it stands - that table is your calibration, and every later program depends on it.']))

n.push(h3('✅ Check Yourself'))
n.push(p('The robot stands for ten seconds without help, and the ', { code: 'ang.json' }, ' on the board is no longer the default one.'))
n.push(image('271/ec4e63c0'))
n.push(image('306/76e10088'))
n.push(image('306/e0d31c25'))

/* ------------------------------------------------------------ ACTIVITY 2 */
n.push(h2('🧪 Activity 2  Drive It Over WiFi'))
n.push(quote(
  p('📱 One job: eight buttons on your phone, each one a motion. The robot serves the page itself - no internet, no server, no app.'),
  ol([
    [ 'Put your WiFi name and password in ', { code: 'WIFI_SSID' }, ' and ', { code: 'WIFI_PASS' }, ' inside ', { code: 'main.py' }, '.' ],
    [ 'Save ', { code: 'main.py' }, ' and ', { code: 'control.html' }, ' to the board; ', { code: 'ang.json' }, ' is created on the first run.' ],
    'Run it, read the IP address printed in the Shell, and open that address on a phone on the same WiFi.',
  ]),
))

n.push(h3('1️⃣ Three Files on the Board'))
n.push(table(['File', 'What it holds', 'Do you edit it?'], [
  [{ code: 'ang.json' }, 'the standing pose from Activity 1', 'only if the robot does not stand'],
  [{ code: 'control.html' }, 'the page the phone shows', 'yes - colours, buttons, layout'],
  [{ code: 'main.py' }, 'the gait plus a small web server', 'the WiFi name and password'],
]))
n.push(vfilesOf('Program 2: WiFi remote'))

n.push(h3('2️⃣ The Control Page'))
n.push(p({ code: 'control.html' }, ' is one plain HTML file: no framework, no CDN, no internet. Eight buttons, each calling ', { code: 'fetch(...)' }, ' instead of following a link, so the page never reloads and the address bar stays on the robot IP.'))
n.push(table(['Button', 'Path', 'Motion', 'What it does'], [
  ['Forward', { code: '/go' }, { code: 'goahead()' }, 'five full gait cycles, about one metre'],
  ['Back', { code: '/back' }, { code: 'goback()' }, 'five cycles backwards'],
  ['Left', { code: '/left' }, { code: 'turnleft()' }, 'five small turns in place'],
  ['Right', { code: '/right' }, { code: 'turnright()' }, 'the same, the other way'],
  ['Punch', { code: '/punch' }, { code: 'punch()' }, 'crouch, raise both fists, throw five punches'],
  ['Kick', { code: '/kick' }, { code: 'kick()' }, 'lean, wind up the right leg, kick'],
  ['Push-up', { code: '/pushup' }, { code: 'pushup()' }, 'lie down, three push-ups, stand up'],
  ['Stand', { code: '/reset' }, { code: 'stand(True)' }, 're-drive the standing pose from scratch'],
]))
n.push(p('The page is read from flash on every request, so you can restyle it without re-uploading ', { code: 'main.py' }, '.'))

n.push(h3('3️⃣ What the Server Must Get Right'))
n.push(table(['Rule', 'Why'], [
  ['Answer, then move', ['the 204 goes out and the socket closes ', { bold: 'before' }, ' the gait starts, or the phone waits four seconds and the button feels broken']],
  ['Never block on an idle socket', [{ code: 'settimeout(2)' }, ' plus a ', { code: 'try/except' }, ' around ', { code: 'recv' }, ' - browsers open a connection early and send nothing']],
  ['Serve the page from a file', [{ code: "load_page('control.html')" }, ' reads it fresh each time, with ', { code: 'Cache-Control: no-store' }, ' so edits show up']],
  ['Always end standing', ['every branch calls ', { code: 'stand()' }, ' at the bottom, or the next Forward starts from a fallen pose']],
]))
n.push(callout('🌐', 'The robot is not on the internet - only on your WiFi. A blank page usually means the phone is on 4G, or the DHCP lease changed and the IP in the Shell is no longer the one in the address bar.'))

n.push(h3('✅ Check Yourself'))
n.push(p('Press Forward once: five gait cycles is about one metre. Press Stand and confirm the robot returns to exactly the pose it started in.'))

/* ------------------------------------------------------------ ACTIVITY 3 */
n.push(h2('🧪 Activity 3  Let It Dance'))
n.push(quote(
  p('🎭 One job: a seven-move show you can reorder in one function. No WiFi, no AI - just moves and a running order.'),
  ol([
    [ 'Save ', { code: 'main.py' }, ' to the board and run it. ', { code: 'ang.json' }, ' is created on the first run if it is missing.' ],
    'Clear one metre around the robot before starting.',
  ]),
))

n.push(h3('1️⃣ Two Files, No Network'))
n.push(vfilesOf('Program 3: dance show'))
n.push(p('Nothing here touches the network: every line below ', { code: 'def show' }, ' is a movement.'))

n.push(h3('2️⃣ The Seven Moves'))
n.push(table(['Move', 'Joints that move', 'What it looks like'], [
  ['nod', 'right ankle', 'toe taps the floor twice'],
  ['twist', 'both ankles, one shoulder, one arm', 'hips sway left then right, arms alternate'],
  ['flap', 'both shoulders, both arms, both hands', 'arms open and close like wings'],
  ['toe_tap', 'right ankle, both shoulders', 'toe taps while the arms are held up'],
  ['peacock', 'hips, knees, both arms, both hands', 'deep squat while the arms open like a fan'],
  ['lotus', 'both arms, both hands', 'hands trace a slow circle in the air'],
  ['bow', 'hips, knees, one shoulder, one hand', 'folds forward from the waist and comes back'],
]))
n.push(p('Every move has the same shape: a counter ', { code: 'a' }, ' walks 0 to 13 and each joint is written as ', { code: 'base + k * a' }, ', so the sign of ', { code: 'k' }, ' decides which way it travels. Change the loop length and the move gets slower; change ', { code: 'k' }, ' and it gets bigger.'))
n.push(p({ bold: 'The one exception.' }, ' ', { code: 'peacock' }, ' uses a helper because the hips travel 0 to 80 while the arms open and close twice, so the leg and arm motion cannot share one counter.'))

n.push(h3('3️⃣ Chaining the Show'))
n.push(code(SHOW_CODE))
n.push(p({ code: 'show()' }, ' is the whole choreography: one call per line, repeats written out. To make the robot bow twice at the end, add another ', { code: 'bow()' }, '.'))
n.push(callout('⏱️', ['Timing is the performance. A move reads correctly at 14 frames of 17 ms - about a quarter second per half cycle. Make the loop shorter and the move looks like a twitch; longer and it looks like it is underwater.']))

n.push(h3('✅ Check Yourself'))
n.push(p('The robot finishes the show back in the standing pose, and you can name every move from the table above without reading the code.'))

/* ------------------------------------------------------------ ACTIVITY 4 */
n.push(h2('🧪 Activity 4  Command It With AI'))
n.push(quote(
  p('🎤 One job: say a phrase, the robot acts. The listening and the thinking happen in the AI module; this program only reads one line of text and calls a function.'),
  ol([
    'Put the AI module on your WiFi through its own setup page.',
    [ 'Wire it to UART2, then save ', { code: 'main.py' }, ', ', { code: 'ang.json' }, ' and ', { code: 'ssd1306.py' }, '.' ],
    'Teach the module the seven phrases, then talk to it.',
  ]),
))

n.push(h3('1️⃣ Put the AI Module on WiFi'))
n.push(p({ bold: 'Connect to the hotspot.' }, ' The module broadcasts a network named XiaoZhi-XXXX, printed on its label.'))
n.push(image('257/6462dbea'))
n.push(p({ bold: 'Open the setup page.' }, ' ', { code: '192.168.4.1' }, ' is the module talking before it has joined anything.'))
n.push(image('244/de62c7fe'))
n.push(p({ bold: 'Choose the school WiFi.' }, ' ', { code: 'MINXIN-S' }, ' with the password ', { code: 'Minxin520' }, '.'))
n.push(image('233/bde136b5'))
n.push(p({ bold: 'Restart and note the address.' }, ' The Shell prints ', { code: 'connected: True' }, ' and an IP you can ping.'))

n.push(h3('2️⃣ Wire It Up, Then Three Files'))
n.push(table(['Module pin', 'ESP32 pin', 'Note'], [
  ['TX', 'GPIO16 (RX2)', 'module talks, board listens'],
  ['RX', 'GPIO17 (TX2)', 'board talks, module listens'],
  ['GND', 'GND', 'common ground or nothing works'],
  ['baud rate', '115200', 'same on both sides'],
]))
n.push(p('Cross the two data lines - module TX to board RX - and share ground. Then three files:'))
n.push(table(['File', 'What it holds', 'Do you edit it?'], [
  [{ code: 'ang.json' }, 'the standing pose from Activity 1', 'only if the robot does not stand'],
  [{ code: 'main.py' }, 'UART reader, seven actions, OLED face', ['the ', { code: 'CMDS' }, ' table']],
  [{ code: 'ssd1306.py' }, 'the OLED driver', ['no - but ', { code: 'import ssd1306' }, ' fails without it']],
]))
n.push(vfilesOf('Program 4: talk to it'))

n.push(h3('3️⃣ Teach It the Phrases'))
n.push(p('Open the module configuration and give it this instruction. The seven answers must match the table below character for character - that is the whole contract between the module and the robot.'))
n.push(promptBlock())
n.push(table(['You say', 'The module sends', 'The robot runs'], [
  ['挥挥手', '好的挥手', { code: 'wave()' }],
  ['鞠个躬', '好的鞠躬', { code: 'bow()' }],
  ['踢球', '好的踢球', { code: 'kick()' }],
  ['打一拳', '好的打拳', { code: 'punch()' }],
  ['蹲下', '好的蹲下', { code: 'squat()' }],
  ['跳个舞', '好的跳舞', { code: 'dance()' }],
  ['站起来', '好的起立', { code: 'stand()' }],
]))

n.push(h3('4️⃣ Where the Intelligence Actually Lives'))
n.push(table(['Stage', 'Who does it', 'Where'], [
  ['Listen', 'the module microphone and its own speech model', 'inside the module'],
  ['Think', 'the language model behind the module', 'the cloud'],
  ['Speak', 'the module speaker', 'inside the module'],
  ['Answer in text', 'one short phrase over UART', 'GPIO16 on the board'],
  ['Move', 'this program matching phrase to function', { code: 'main.py' }],
]))
n.push(p('That is why the program is short: recognition, language and voice are all somewhere else, and the boundary is plain text. Swap the module for a phone app or a laptop script and the moves do not change.'))
n.push(callout('📷', 'The module also has a camera. Ask it what is in front of you and it answers in speech - no code on the robot, because the answer never leaves the module.'))

n.push(h3('✅ Check Yourself'))
n.push(p('Say each of the seven phrases once. The OLED face changes before the arm moves, and the robot returns to the standing pose after every action.'))

/* ---------------------------------------------------------- ACTIVITY 5 */
n.push(h2('🧪 Activity 5 (Extra) Make It Yours'))
n.push(quote(
  p('🏆 Four programs, four jobs. Pick one and change it - each challenge below is a small edit to a file you already have.'),
))

n.push(h3('✏️ Three Challenges'))
n.push(ol([
  ['A second pose. Fold the legs and bring the arms forward in ', { code: 'sit.json' }, ', then write one function that takes a filename and a number of steps and moves every joint from wherever it is to that pose without jumping.'],
  ['A button that does two things. Add ', { code: '/dance' }, ' to the server, map it to three moves, and add the button. Note that the browser will happily send a second request while the first is still running - decide what should happen.'],
  ['A phrase with a condition. Right now every phrase maps to one action. Make one phrase pick between two actions depending on a state variable you keep.'],
]))

n.push(h3('📤 Submit Your Homework'))
n.push(p('Finished the challenges? Submit ', { code: 'ang.json' }, ', ', { code: 'main.py' }, ' and one short paragraph: which joint was furthest from the class value on your robot, and how you found it.'))
n.push(widget('homework'))

n.push(h3('💬 Share Your Idea'))
n.push(p('Post the move you invented - its name, which joints it uses, and what it looks like when it goes wrong. The failures are usually more instructive than the successes.'))
n.push(widget('comment'))

/* -------------------------------------------------------------- document */
const doc = { type: 'doc', attrs: row.content.attrs || {}, content: n }

/* ---------------------------------------------------------------- checks */
const problems = []
const heads = n.filter((x) => x.type === 'heading')
const ids = heads.map((h) => h.attrs.id)
if (new Set(ids).size !== ids.length) problems.push('duplicate heading ids')
for (const h of heads) if (!h.content?.[0]?.marks?.some((m) => m.type === 'bold')) problems.push('heading without bold: ' + txt(h))
for (let i = 0; i < n.length; i++) {
  if (n[i].type === 'heading' && n[i].attrs.level === 2 && /Activity/.test(txt(n[i]))) {
    if (n[i + 1]?.type !== 'blockquote') problems.push('no intro blockquote under ' + txt(n[i]))
  }
}
for (const tb of n.filter((x) => x.type === 'table')) {
  const cols = tb.content[0].content.length
  const bad = tb.content.find((r) => r.content.length !== cols)
  if (bad) problems.push('table with ' + cols + ' header cells but a row of ' + bad.content.length)
}
// every screenshot and widget from the old chapter must survive
const oldImages = old.filter((x) => x.type === 'image').length
const newImages = n.filter((x) => x.type === 'image').length
if (oldImages !== newImages) problems.push(`images: ${oldImages} before, ${newImages} after`)
const vf = n.filter((x) => x.type === 'vue' && x.attrs?.type === 'vfiles')
if (vf.length !== 4) problems.push('vfiles blocks: ' + vf.length)
for (const t of ['homework', 'comment']) {
  if (!n.some((x) => x.type === 'vue' && x.attrs?.type === t)) problems.push('missing widget: ' + t)
}
if (n[n.length - 1].type === 'paragraph' && !txt(n[n.length - 1])) problems.push('trailing empty paragraph')

console.log(`nodes: ${old.length} -> ${n.length} | images ${newImages} | vfiles ${vf.length} | tables ${n.filter((x) => x.type === 'table').length} | paragraphs ${n.filter((x) => x.type === 'paragraph').length}`)
console.log('\noutline:')
for (const x of n) {
  if (x.type === 'heading') console.log((x.attrs.level === 2 ? '' : '    ') + txt(x))
}
console.log(problems.length ? '\nPROBLEMS:\n  ' + problems.join('\n  ') : '\nsanity: ok')
await sql.end()
if (DRY) {
  const line = (x) => {
    if (!x || typeof x !== 'object') return ''
    if (x.type === 'text') return x.text || ''
    if (x.type === 'hardBreak') return ' '
    return (x.content || []).map(line).join('')
  }
  const render = (x, indent = '') => {
    switch (x.type) {
      case 'heading': console.log('\n' + '#'.repeat(x.attrs.level) + ' ' + line(x)); break
      case 'paragraph': console.log(indent + line(x)); break
      case 'blockquote': console.log(indent + '> '); (x.content || []).forEach((c) => render(c, indent + '> ')); break
      case 'orderedList':
      case 'bulletList':
        (x.content || []).forEach((li, i) => {
          const mark = x.type === 'orderedList' ? `${i + 1}. ` : '- '
          console.log(indent + '  ' + mark + line(li))
        })
        break
      case 'table':
        x.content.forEach((r, i) => {
          console.log(indent + '  | ' + r.content.map(line).join(' | '))
          if (i === 0) console.log(indent + '  |' + r.content.map(() => '---').join('|'))
        })
        break
      case 'codeBlock': console.log(indent + '  ' + (line(x) || '').split('\n').join('\n  ')); break
      case 'callout': (x.content || []).forEach((c) => render(c, indent + '  ! ')); break
      case 'image': console.log(indent + '  [image]'); break
      case 'vue': {
        const a = x.attrs || {}
        if (a.type === 'vfiles') console.log(indent + '  [files: ' + JSON.parse(a.content).items[0].children.map((f) => f.label).join(', ') + ']')
        else console.log(indent + '  [widget: ' + a.type + ']')
        break
      }
      default: if (x.content) x.content.forEach((c) => render(c, indent))
    }
  }
  console.log('\n================ rendered ================')
  n.forEach((x) => render(x))
  console.log('\n--dry: nothing sent')
  process.exit(problems.length ? 1 : 0)
}
if (problems.length) {
  console.error('\nrefusing to upload')
  process.exit(1)
}

/* ---------------------------------------------------------------- upload */
const login = await fetch(`${BASE}/api/auth/login`, {
  method: 'POST', headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ username: USER, password: PASS }),
})
const cookie = (login.headers.getSetCookie?.() || []).map((c) => c.split(';')[0]).join('; ')
if (!login.ok || !cookie) {
  console.error('login failed:', login.status)
  process.exit(1)
}
const res = await fetch(`${BASE}/api/chapters/update`, {
  method: 'POST', headers: { 'Content-Type': 'application/json', Cookie: cookie },
  body: JSON.stringify({ id: 217, content: doc }),
})
console.log('\nupdate:', res.status, (await res.text()).slice(0, 160))
if (!res.ok) process.exit(1)

const back = await fetch(`${BASE}/api/chapters/show?id=217`, { headers: { Cookie: cookie } })
const data = await back.json()
const saved = (data?.data?.chapter ?? data?.chapter ?? data?.data ?? data).content?.content || []
console.log(`saved: ${saved.length} nodes, ${saved.filter((x) => x.type === 'image').length} images, ` +
  `${saved.filter((x) => x.type === 'vue' && x.attrs?.type === 'vfiles').length} file blocks`)
