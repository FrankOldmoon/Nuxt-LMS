/**
 * Rewrite chapter 186 (course 4, "WebXR") as a prompt-driven WebXR tutorial:
 * nine prompts you hand to opencode, going from one cube to a finished AR app,
 * then a Git chapter that puts the code into the school Gitea.
 *
 *   node build.mjs --dry    # print the outline and the rendered text
 *   node build.mjs          # upload
 */
import postgres from '/Users/oldmoon/Documents/ubuntu/nuxt_lms_2026/node_modules/postgres/src/index.js'

const BASE = process.env.LMS || 'http://10.28.1.151'
const USER = process.env.LMS_USER || 'admin'
if (!process.env.LMS_PASS) throw new Error('请设置 LMS_PASS 环境变量（LMS 管理员密码）')
const PASS = process.env.LMS_PASS
const DRY = process.argv.includes('--dry')
const CHAPTER = 186

/* ------------------------------------------------------------------ nodes */
const PA = { indent: null, margin: null, wordWrap: 'normal', textAlign: null, indentUnit: null, lineHeight: 1.75 }
let uid = 0
const nid = () => 'wx' + (uid++).toString(36) + Math.random().toString(36).slice(2, 5)
const t = (text, marks) => ({ type: 'text', text, ...(marks ? { marks } : {}) })
const seg = (s) =>
  typeof s === 'string' ? t(s)
  : s.code !== undefined ? t(s.code, [{ type: 'code' }])
  : s.bold !== undefined ? t(s.bold, [{ type: 'bold' }])
  : t(s.text)
const p = (...segs) => ({ type: 'paragraph', attrs: { ...PA }, content: segs.map(seg) })
const ul = (items) => ({
  type: 'bulletList', attrs: { type: null, margin: null, listType: 'disc' },
  content: items.map((it) => ({ type: 'listItem', attrs: { indent: null, indentUnit: null }, content: [Array.isArray(it) ? p(...it) : p(it)] })),
})
const ol = (items) => ({
  type: 'orderedList', attrs: { type: null, start: 1, margin: null, listType: 'decimal' },
  content: items.map((it) => ({ type: 'listItem', attrs: { indent: null, indentUnit: null }, content: [Array.isArray(it) ? p(...it) : p(it)] })),
})
const quote = (...blocks) => ({ type: 'blockquote', content: blocks.filter(Boolean) })
const h2 = (text) => {
  const id = nid()
  return { type: 'heading', attrs: { id, level: 2, ...PA, 'data-toc-id': id }, content: [t(text, [{ type: 'bold' }])] }
}
const h3 = (text) => {
  const id = nid()
  return { type: 'heading', attrs: { id, level: 3, ...PA, 'data-toc-id': id }, content: [t(text, [{ type: 'bold' }])] }
}
const callout = (icon, text) => ({
  type: 'callout', attrs: { icon, type: 'primary', margin: null, backgroundColor: 'rgb(217, 231, 255)' },
  content: [Array.isArray(text) ? p(...text) : p(text)],
})
const HDR = { align: null, color: null, colspan: 1, rowspan: 1, colwidth: null, background: 'rgb(242,243,245)' }
const CELL = { align: null, color: null, colspan: 1, rowspan: 1, colwidth: null, background: null }
const cell = (node, kind) => ({ type: kind, attrs: { ...(kind === 'tableHeader' ? HDR : CELL) }, content: [Array.isArray(node) ? p(...node) : p(node)] })
const table = (headers, rows) => ({
  type: 'table', attrs: { margin: null },
  content: [{ type: 'tableRow', content: headers.map((x) => cell(x, 'tableHeader')) },
    ...rows.map((r) => ({ type: 'tableRow', content: r.map((c) => cell(c, 'tableCell')) }))],
})
const pre = (text, lang = 'text') => ({
  type: 'codeBlock',
  attrs: { theme: 'light', margin: null, language: lang, textWrap: true },
  content: [t(text)],
})

/* --------------------------------------------------------------- prompts */
const P1 = `Set up this folder as a Vite project and build the smallest WebXR scene.

- Run npm create vite@latest . -- --template vanilla, then npm install three.
- src/main.js: WebGLRenderer with antialias, renderer.xr.enabled = true,
  light grey background, PerspectiveCamera at (0, 1.6, 3).
- One 0.5 m cube at (0, 1.4, -1), MeshStandardMaterial, colour 0x4ade80,
  plus a HemisphereLight so it is visible without a lamp.
- Import VRButton from three/addons/webxr/VRButton.js and append it to the body.
- Render with renderer.setAnimationLoop; rotate the cube 0.01 rad per frame.
- Handle window resize. One short comment per block.

Acceptance: npm run dev shows a spinning green cube and an ENTER VR button.
On a laptop the button does nothing, which is correct.
Tell me the exact commands to run. No dependencies beyond three.`

const P2 = `Make the scene look like a small room.

- Add a 6 x 6 m floor at y = 0 with a subtle grid: use THREE.GridHelper, or a
  MeshStandardMaterial with a repeating CanvasTexture.
- Add a DirectionalLight at (3, 6, 4) with castShadow, shadow map 2048,
  and a shadow camera that covers the whole floor.
- Cube gets castShadow, floor gets receiveShadow.
- Add three more objects: a 0.3 m sphere at (-1, 0.3, -1), a 1 m x 0.4 m x 2 m
  box as a table at (1.5, 0.2, -2), and a thin cylinder as a plant pot on the table.
- Give each object its own colour and keep the same material type.

Acceptance: shadows fall on the floor, nothing floats, and the frame rate is
still smooth on a phone. Keep all geometry procedural - no model files.`

const P3 = `Add readable labels and finish the materials.

- Write a helper makeLabel(text, colour) that draws the text on a 2D canvas and
  returns a Sprite, so a label always faces the camera.
- Put a label 0.3 m above each object with its name, and one label on the floor
  in front of the camera saying WELCOME.
- Make the floor semi-transparent (opacity 0.9) so it reads as a surface, and
  give the table a slightly rough metalness of 0.2.
- Set renderer.toneMapping = THREE.ACESFilmicToneMapping and
  renderer.outputColorSpace = THREE.SRGBColorSpace.

Acceptance: every label is readable from 2 m away and does not flicker when you
move your head. Still no external assets.`

const P4 = `Add controller input.

- In src/main.js, get both controllers with renderer.xr.getController(0) and (1).
- Add each to the scene, and draw a 1 m line from each controller along -Z so you
  can see where it points.
- On selectstart, raycast from the controller into the scene with THREE.Raycaster.
  If a mesh is hit, change its material colour to orange and log its name.
- On selectend, restore the original colour.
- Also handle the gamepad button A/B if easy: skip it if it makes the code longer.

Acceptance: in the headset the beam points where your hand points, and pointing
at an object and pulling the trigger turns that object orange and back.`

const P5 = `Turn the beam into a grab.

- On selectstart, if the ray hits a mesh, remember it and move it 0.5 m along the
  controller's forward direction, so it jumps to the hand.
- While the trigger is held, keep the grabbed mesh at
  controller position + 0.5 * forward, and keep it at least 0.1 m above the floor.
- On selectend, drop it: stop updating its position and let it stay where it was.
- Ignore the floor mesh - it must never be grabbable.
- Add a small state variable so two hands cannot grab the same object.

Acceptance: you can pick up the cube and the sphere, carry them, and drop them in
mid-air or on the table. The floor never moves.`

const P6 = `Add an AR mode with hit-testing.

- Replace VRButton with ARButton from three/addons/webxr/ARButton.js, created with
  { requiredFeatures: ['hit-test'], optionalFeatures: ['dom-overlay'] } and
  domOverlay: { root: document.getElementById('overlay') }.
- Add a <div id="overlay"> to index.html, and a short line of instructions in it.
- When the session starts, request a viewer reference space and a hit-test source:
  const viewer = await session.requestReferenceSpace('viewer');
  const hitTestSource = await session.requestHitTestSource({ space: viewer });
- In the frame loop, call session.getHitTestResults(hitTestSource), take the first
  result, and place a ring (RingGeometry, 0.1 m radius, rotated flat) at its pose.
- On select, clone the cube at the ring position, then hide the ring.
- Handle hitTestSource.end() when the session ends.

Acceptance: on a phone in AR the ring finds the floor and follows it, and pulling
the trigger leaves a cube standing on the real floor.`

const P7 = `Make the placed objects stay put with anchors.

- After a select in AR, instead of cloning at the ring pose, create an anchor:
  frame.createAnchor(pose, referenceSpace). Await it and store it in an array.
- Each frame, read anchor.anchorSpace and update the stored mesh from it, so the
  object no longer drifts when the phone moves.
- If createAnchor is not available, fall back to the fixed pose and log a warning.
- Add a long press or the B button to clear all placed objects and release anchors.

Acceptance: walk around the room and the placed cubes stay where you left them.
Stop the session and they disappear - that is expected, they are session objects.`

const P8 = `Turn the project into a target game called WebXR Range.

Rules:
- A start panel in the DOM overlay with a START button and a difficulty selector.
- When the game starts, spawn 5 targets (a flat cylinder with a red centre ring)
  in front of the player between 2 and 4 m away, at head height, one at a time.
- Pointing at a target and pulling the trigger scores a hit, plays a short beep
  with the Web Audio API, and makes the target pop and disappear.
- Each target lives 3 seconds, then moves somewhere else. Score, time left and
  hits/misses are shown in the overlay.
- After 5 hits or 60 seconds, show a result panel with score and a PLAY AGAIN button.

Keep the game logic in a separate src/game.js with plain functions, and import it
from main.js. Do not add a framework and do not add dependencies.`

const P9 = `Polish and make it safe to hand to someone else.

- Add a reading of the rules in the overlay, collapsed behind a DETAILS element.
- Show the frame rate in a corner, updated once per second.
- Pause the game when the XR session ends and resume when it starts.
- Make every button reachable by thumb on a phone in portrait.
- Add a README.md with: what it is, how to run it (npm install, npm run dev),
  how to open it in the headset, and the controls table.
- Add .gitignore with node_modules, dist and .DS_Store.

Acceptance: someone who has never seen the project can run it from the README
alone, and nothing in the overlay overlaps on a 390 px wide phone.`

/* --------------------------------------------- homework and comment widgets */
const sql = postgres(
  process.env.PG || 'postgresql://postgres:REDACTED@10.28.1.151:5432/nuxt_lms_2026',
  { idle_timeout: 10, max: 1 },
)

const login = await fetch(`${BASE}/api/auth/login`, {
  method: 'POST', headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ username: USER, password: PASS }),
})
const cookie = (login.headers.getSetCookie?.() || []).map((c) => c.split(';')[0]).join('; ')
if (!login.ok || !cookie) { console.error('login failed', login.status); process.exit(1) }

/** Create the homework / discussion once, then reuse it by name. */
const ensureEntry = async (table, name, lines, extra = {}) => {
  // postgres.js only treats sql(x) as an identifier when x is a Table object,
  // so the two lookups are written out instead of interpolated
  const rows = table === 'homeworks'
    ? await sql`select cid from homeworks where course_id = 4 and name = ${name} and deleted_at is null limit 1`
    : await sql`select cid from comments where course_id = 4 and name = ${name} and deleted_at is null limit 1`
  if (rows.length) return rows[0].cid
  const content = {
    type: 'doc',
    content: lines.map((text) => ({ type: 'paragraph', attrs: { ...PA }, content: [{ type: 'text', text }] })),
  }
  const res = await fetch(`${BASE}/api/${table}/add`, {
    method: 'POST', headers: { 'Content-Type': 'application/json', Cookie: cookie },
    body: JSON.stringify({ course_id: 4, name, content, ...extra }),
  })
  const body = await res.json().catch(() => null)
  if (!body?.success) { console.error('create failed:', table, JSON.stringify(body).slice(0, 200)); process.exit(1) }
  console.log(`+ ${table} cid ${body.data.cid}  ${name}`)
  return body.data.cid
}

const hwCid = DRY ? 0 : await ensureEntry('homeworks', '🔗 Your WebXR repository', [
  'Paste the published link from Activity 6 - it looks like http://10.28.1.160/<your-id>-webxr-demo/ .',
  'Marked on three things: the link opens, the game runs, and the README explains how to start it.',
], { point: 10 })
const cmCid = DRY ? 0 : await ensureEntry('comments', '💬 Your best prompt', [
  'Which prompt saved you the most time? Paste it exactly as you sent it, plus one line on why it worked.',
  'Someone will copy it next lesson - make it worth copying.',
])

const homeworkNode = { type: 'vue', attrs: { type: 'homework', height: null, content: String(hwCid) } }
const commentNode = { type: 'vue', attrs: { type: 'comment', height: null, content: String(cmCid) } }

/* ------------------------------------------------------------------- doc */
const n = []

n.push(quote(
  p('📘 WebXR with opencode: you write the prompt, the agent writes the code.'),
  p('Six activities take it from one spinning cube to a published AR game on the school Git server.'),
  ul([
    [ { bold: 'You drive.' }, ' Every step is a prompt you paste in - read it before you send it.' ],
    [ { bold: 'You check.' }, ' Every step ends with an acceptance line. If it does not hold, the change is not done.' ],
  ]),
))

n.push(h2('🎯 Learning Objectives'))
n.push(ol([
  [ 'Install opencode, connect a model, and drive it with ', { code: '/init' }, ', plan mode and file references.' ],
  'Write a prompt that states the API, the acceptance test and the constraint, and get working WebXR code back.',
  [ 'Use ', { code: 'renderer.xr' }, ', controller ', { code: 'select' }, ' events, raycasting and AR hit-testing to build interaction.' ],
  [ 'Push the project to a Gitea repository with commits that describe what changed and why.' ],
]))

n.push(h3('📖 Glossary'))
n.push(table(['Term', 'What it means here'], [
  ['opencode', 'The coding agent you open from the desktop. You type what you want; it edits the files in the folder you opened and runs commands.'],
  ['AGENTS.md', 'A file at the project root that opencode reads on every task: stack, conventions, what not to touch.'],
  ['Plan / Build', 'Two modes, switched with Tab. Plan only reads and proposes; Build edits files.'],
  ['WebXR', 'The browser API that gives a page access to VR and AR sessions, controllers and the real world.'],
  ['XR session', 'One running experience: immersive-vr (the room replaced) or immersive-ar (the room still visible).'],
  ['Reference space', 'The coordinate frame the session uses. viewer follows the camera, which is what hit-testing needs.'],
  ['Hit-test', 'Asking the device where a ray from the camera meets a real surface, so you can place something on the floor.'],
  ['Anchor', 'A pose pinned to the real world. Without one, a placed object drifts as tracking corrects itself.'],
  ['selectstart / selectend', 'The WebXR events for the trigger: pressed and released. squeeze is the grip button.'],
  ['MINXIN Git', 'The school Git server at 10.28.1.160. It takes a prompt, stores your code and publishes a link.'],
]))

/* ------------------------------------------------------------- ACTIVITY 1 */
n.push(h2('🧪 Activity 1  First Scene'))
n.push(quote(
  p('🧊 Goal: tell opencode what you want; it makes the project and the first scene.'),
  ol([
    'Make an empty folder and open it in opencode.',
    'Paste prompt 1 and let it work.',
    'Run the commands it gives you.',
  ]),
))

n.push(h3('1️⃣ Open opencode'))
n.push(p('Make an empty folder on the Desktop called ', { code: 'webxr' }, '. Double-click the opencode icon, choose ', { bold: 'Open folder' }, ' and pick that folder - the agent works inside whatever folder you open.'))
n.push(p('First time only: connect a model where it asks (or type ', { code: '/connect' }, ' in the prompt box), then run ', { code: '/init' }, ' once so it reads the folder and writes ', { code: 'AGENTS.md' }, '.'))

n.push(h3('2️⃣ Prompt 1'))
n.push(pre(P1))

n.push(h3('3️⃣ What You Should See'))
n.push(table(['You should see', 'If you do not'], [
  ['a green cube slowly spinning on grey', 'a black page: read the first error in the browser console'],
  ['an ENTER VR button', 'no button: the VRButton path is wrong, it is three/addons/webxr/VRButton.js'],
  ['both survive a window resize', 'a stretched cube: the resize handler is missing'],
]))

n.push(h3('✅ Check Yourself'))
n.push(p('The cube spins, and you can say in one sentence what ', { code: 'renderer.xr.enabled' }, ' changes about the render loop.'))

/* ------------------------------------------------------------- ACTIVITY 2 */
n.push(h2('🧪 Activity 2  Make It Look Like a Room'))
n.push(quote(
  p('🪑 Goal: a floor, real light and shadows, and labels you can read. Same scene, three objects more, and one habit to learn: ask for one change at a time.'),
  ol([
    'Send prompt 2, look at the page, then send prompt 3.',
    'One change per prompt: when it breaks you know which one did it.',
  ]),
))

n.push(h3('1️⃣ Prompt 2: floor, light, shadows'))
n.push(pre(P2))

n.push(h3('2️⃣ Prompt 3: labels and colour'))
n.push(pre(P3))
n.push(table(['Prompt habit', 'Why it matters'], [
  ['Name the exact file and the exact API', 'The agent guesses the rest, and a guessed three.js version is a broken import. Naming the class keeps the answer in the version you installed.'],
  ['State the acceptance line', 'You get something to test instead of something to admire.'],
  ['One change per prompt', 'When it breaks you know which prompt did it, and that one message is what you undo.'],
  ['Say what not to do', [{ code: 'no model files, no extra dependencies' }, ' - otherwise you inherit an asset pipeline you never asked for.']],
]))

n.push(h3('✅ Check Yourself'))
n.push(p('Shadows land on the floor, every label faces you as you move, and the whole scene is still made of code - no downloaded models.'))

/* ------------------------------------------------------------- ACTIVITY 3 */
n.push(h2('🧪 Activity 3  Controllers and Interaction'))
n.push(quote(
  p('🎮 Goal: a beam from each hand, an object that reacts when you point at it, and a grab you can carry. This is where a scene becomes something you can touch.'),
  ol([
    'Send prompt 4, then prompt 5.',
    'Test in the headset - a beam that looks right on a laptop can point the wrong way in VR.',
  ]),
))

n.push(h3('1️⃣ Prompt 4: ray and select'))
n.push(pre(P4))

n.push(h3('2️⃣ Prompt 5: grab and drop'))
n.push(pre(P5))
n.push(table(['Event', 'Fires when', 'Typical use'], [
  [{ code: 'selectstart' }, 'the trigger goes down', 'start a grab, fire a shot, pick a menu item'],
  [{ code: 'selectend' }, 'the trigger comes up', 'drop what you hold, stop firing'],
  [{ code: 'select' }, 'a full press and release', 'a single click, when holding is not the point'],
  [{ code: 'squeezestart' }, 'the grip goes down', 'secondary action: scale, teleport, open a tool menu'],
]))

n.push(h3('✅ Check Yourself'))
n.push(p('You can pick up the cube with either hand, carry it, and drop it on the table. Pointing at the floor never grabs it.'))

/* ------------------------------------------------------------- ACTIVITY 4 */
n.push(h2('🧪 Activity 4  AR: Put It On Your Desk'))
n.push(quote(
  p('📱 Goal: the same project in AR - a ring that finds your real floor, and objects that stay where you leave them.'),
  ol([
    'Send prompt 6, then prompt 7.',
    'Test on the Quest 3 or a phone - a desktop browser only shows the button.',
  ]),
))

n.push(h3('1️⃣ Prompt 6: AR button and hit-test'))
n.push(pre(P6))

n.push(h3('2️⃣ Prompt 7: anchors'))
n.push(pre(P7))
n.push(callout('🔒', [
  'WebXR only runs on a secure origin: ', { code: 'https://' }, ' or ', { code: 'localhost' },
  '. Your phone or headset cannot open ', { code: 'http://192.168.x.x:5173' }, ' - that is not a secure context and the session will be refused. Two ways out: run ',
  { code: 'npm run dev -- --host' }, ' behind a trusted certificate, or plug the headset in over USB and run ',
  { code: 'adb reverse tcp:5173 tcp:5173' }, ', then open ', { code: 'http://localhost:5173' }, ' inside the headset. The USB route is the reliable one in a classroom.',
]))

n.push(h3('✅ Check Yourself'))
n.push(p('In AR the ring follows the floor as you move the phone, and a placed cube stays put when you walk around it.'))

/* ------------------------------------------------------------- ACTIVITY 5 */
n.push(h2('🧪 Activity 5  Finish the App'))
n.push(quote(
  p('🎯 Goal: a small game with a start panel, five targets, a score and a result screen - built from the pieces you already have, not from scratch.'),
  ol([
    'Send prompt 8, then prompt 9.',
    'Play it three times before you fix anything - write down what felt wrong.',
  ]),
))

n.push(h3('1️⃣ Prompt 8: the game'))
n.push(pre(P8))

n.push(h3('2️⃣ Prompt 9: polish and documentation'))
n.push(pre(P9))
n.push(table(['Before you call it done', 'How to check'], [
  ['It runs from a fresh clone', ['delete ', { code: 'node_modules' }, ', run ', { code: 'npm install' }, ', then ', { code: 'npm run dev' }]],
  ['It survives a reload', 'press F5 in the middle of a game and start again'],
  ['The README is enough', 'hand the repository to a classmate and say nothing'],
  ['No secrets', ['grep the repository for passwords, tokens and student IDs in URLs']],
]))

n.push(h3('✅ Check Yourself'))
n.push(p('Someone else can start your game, score a hit, and finish a round without you explaining anything.'))

/* ------------------------------------------------------------- ACTIVITY 6 */
n.push(h2('🧪 Activity 6  Put It On MINXIN Git'))
n.push(quote(
  p('🗄️ Goal: hand the project to your assistant and let it save, push and publish. You do not have to learn git - the Git server is built for exactly this.'),
  ol([
    'Keep opencode open in the project folder.',
    'Paste prompt 10 with your LMS account filled in.',
    'Open the link it returns.',
  ]),
))

n.push(h3('1️⃣ The Account'))
n.push(table(['Field', 'Use'], [
  ['Account', 'your 8-digit LMS student ID'],
  ['Password', 'your LMS password'],
  ['Do not use', 'your school mailbox address - sign-in fails with it'],
]))

n.push(h3('2️⃣ Prompt 10'))
n.push(p('This is the prompt from the front page of ', { code: 'http://10.28.1.160' }, ', narrowed to this project.'))
n.push(pre(`My LMS account: <8-digit student ID>
My LMS password: <LMS password>
Git server: http://10.28.1.160
Save the WebXR project in this folder into a new repository named webxr-demo,
publish it, and give me the link.
Technical details: http://10.28.1.160/assist.html`))
n.push(p('Only the two account lines are yours to fill. Everything after ', { code: 'Git server' }, ' is what you want done - change ', { code: 'webxr-demo' }, ' if you like a different name.'))

n.push(h3('3️⃣ The Link'))
n.push(p('The assistant answers with a site address, something like ', { code: 'http://10.28.1.160/<your-id>-webxr-demo/' }, '. That is your project running on the school server - not a file on your laptop, a URL you can open on any phone.'))
n.push(table(['Check', 'How'], [
  ['The site opens', 'click the link, press START'],
  ['The game runs', 'shoot one target and finish a round'],
  ['The source is there', ['open the repository from the same page - ', { code: 'src/main.js' }, ' is listed']],
]))

n.push(h3('✅ Check Yourself'))
n.push(p('The link opens on someone else\'s phone, and it is the same link you paste into the assignment below.'))

/* ------------------------------------------------------------- ACTIVITY 7 */
n.push(h2('🧪 Activity 7 (Extra) Make It Yours'))
n.push(quote(
  p('🏆 The project runs, it is published, it is yours. Pick one and write the prompt yourself.'),
))
n.push(ol([
  ['Two hands, two objects. Let both controllers grab at once, and scale a held object with the grip.'],
  ['A target that reacts. Replace the cylinder with something that breaks into pieces when hit.'],
  ['One score, two modes. Place targets in AR, shoot them in VR, keep a single score.'],
]))

n.push(h3('📤 Submit Your Work'))
n.push(p('Paste the published link from Activity 6. Marked on three things: the link opens, the game runs, and the README says how to start it.'))
n.push(homeworkNode)

n.push(h3('💬 Share Your Prompt'))
n.push(p('Which prompt saved you the most time? Paste it exactly as you sent it, plus one line on why it worked - someone will copy it next lesson.'))
n.push(commentNode)

/* ---------------------------------------------------------------- checks */
const doc = { type: 'doc', content: n }   // the editor's doc node has no attrs
const problems = []
const txt = (x) => (!x || typeof x !== 'object' ? '' : x.type === 'text' ? x.text || '' : Array.isArray(x.content) ? x.content.map(txt).join('') : '')

const heads = n.filter((x) => x.type === 'heading')
if (new Set(heads.map((h) => h.attrs.id)).size !== heads.length) problems.push('duplicate heading ids')
for (const h of heads) if (!h.content?.[0]?.marks?.some((m) => m.type === 'bold')) problems.push('heading without bold: ' + txt(h))
for (let i = 0; i < n.length; i++) {
  if (n[i].type === 'heading' && n[i].attrs.level === 2 && /Activity/.test(txt(n[i])) && n[i + 1]?.type !== 'blockquote') {
    problems.push('no intro blockquote under ' + txt(n[i]))
  }
}
for (const tb of n.filter((x) => x.type === 'table')) {
  const cols = tb.content[0].content.length
  const bad = tb.content.find((r) => r.content.length !== cols)
  if (bad) problems.push('table with ' + cols + ' header cells but a row of ' + bad.content.length)
}
if (n[n.length - 1].type === 'paragraph' && !txt(n[n.length - 1])) problems.push('trailing empty paragraph')

// the editor validates the whole document: one empty text node and it will not open
const walkBad = (node, path) => {
  if (!node || typeof node !== 'object') { problems.push('not an object at ' + path); return }
  if (!node.type) { problems.push('missing type at ' + path); return }
  if (node.type === 'text' && (typeof node.text !== 'string' || node.text === '')) {
    problems.push('empty text node at ' + path)
  }
  if (node.attrs && Object.values(node.attrs).some((v) => v === undefined)) problems.push('undefined attr at ' + path)
  if (node.type === 'codeBlock' && !node.attrs?.language) problems.push('codeBlock without language at ' + path)
  ;(node.content || []).forEach((c, i) => walkBad(c, path + '/' + node.type + '[' + i + ']'))
}
walkBad(doc, 'doc')

console.log(`nodes: ${n.length} | prompts: ${n.filter((x) => x.type === 'codeBlock' && x.attrs.language === 'text').length} | commands: ${n.filter((x) => x.type === 'codeBlock' && x.attrs.language === 'bash').length} | tables: ${n.filter((x) => x.type === 'table').length}`)
console.log('\noutline:')
for (const x of n) if (x.type === 'heading') console.log((x.attrs.level === 2 ? '' : '    ') + txt(x))
console.log(problems.length ? '\nPROBLEMS:\n  ' + problems.join('\n  ') : '\nsanity: ok')
if (DRY) {
  await sql.end()
  const line = (x) => {
    if (!x || typeof x !== 'object') return ''
    if (x.type === 'text') return x.text || ''
    return (x.content || []).map(line).join('')
  }
  const render = (x, indent = '') => {
    switch (x.type) {
      case 'heading': console.log('\n' + '#'.repeat(x.attrs.level) + ' ' + line(x)); break
      case 'paragraph': console.log(indent + line(x)); break
      case 'blockquote': (x.content || []).forEach((c) => render(c, indent + '> ')); break
      case 'orderedList':
      case 'bulletList':
        (x.content || []).forEach((li, i) => console.log(indent + '  ' + (x.type === 'orderedList' ? `${i + 1}. ` : '- ') + line(li)))
        break
      case 'table':
        x.content.forEach((r, i) => {
          console.log(indent + '  | ' + r.content.map(line).join(' | '))
          if (i === 0) console.log(indent + '  |' + r.content.map(() => '---').join('|'))
        })
        break
      case 'codeBlock': console.log(indent + '  ```' + (x.attrs.language || '') + '\n  ' + line(x).split('\n').join('\n  ') + '\n  ```'); break
      case 'callout': (x.content || []).forEach((c) => render(c, indent + '  ! ')); break
      default: if (x.content) x.content.forEach((c) => render(c, indent))
    }
  }
  console.log('\n================ rendered ================')
  n.forEach((x) => render(x))
  console.log('\n--dry: nothing sent')
  process.exit(problems.length ? 1 : 0)
}
if (problems.length) { console.error('\nrefusing to upload'); process.exit(1) }

/* ---------------------------------------------------------------- upload */
const res = await fetch(`${BASE}/api/chapters/update`, {
  method: 'POST', headers: { 'Content-Type': 'application/json', Cookie: cookie },
  body: JSON.stringify({ id: CHAPTER, content: doc }),
})
console.log('\nupdate:', res.status, (await res.text()).slice(0, 160))
if (!res.ok) process.exit(1)

const back = await fetch(`${BASE}/api/chapters/show?id=${CHAPTER}`, { headers: { Cookie: cookie } })
const saved = (await back.json()).data.chapter.content.content
console.log(`saved: ${saved.length} nodes, ${saved.filter((x) => x.type === 'heading').length} headings, ${saved.filter((x) => x.type === 'table').length} tables`)
