/**
 * Rewrite the three poster questions in chapter 201 (course 8, ROS).
 *
 * The old set could be answered without reading the poster - "what is each
 * program called: a node / a wheel / a battery / a cable" - so each question
 * here needs something that is actually on the image:
 *
 *   112  single    the two rows of the diagram: a camera is Sensors, not Perception
 *   113  multiple  the Key Features row, three real ones against three invented
 *   114  fill      the middle block that every message passes through
 *
 *   node questions.mjs --dry
 *   node questions.mjs
 */
const BASE = process.env.LMS || 'http://10.28.1.151'
const USER = process.env.LMS_USER || 'admin'
const PASS = process.env.LMS_PASS || 'REDACTED'
const COURSE = 8
const DRY = process.argv.includes('--dry')

/* ---------------------------------------------------------------- helpers */
const PA = { indent: null, margin: null, wordWrap: 'normal', textAlign: null, indentUnit: null, lineHeight: 1.75 }
const t = (text, marks) => ({ type: 'text', text, ...(marks ? { marks } : {}) })
const seg = (s) =>
  typeof s === 'string' ? t(s)
  : s.code !== undefined ? t(s.code, [{ type: 'code' }])
  : s.bold !== undefined ? t(s.bold, [{ type: 'bold' }])
  : { type: 'inputs', attrs: { content: s.blank } }

const para = (parts) => ({ type: 'paragraph', attrs: { ...PA }, content: parts.map(seg) })
const doc = (...paragraphs) => ({ type: 'doc', content: paragraphs })

/* -------------------------------------------------------------- questions */
const QS = [
  {
    cid: 112,
    type: 'single',
    name: '🧱 Sensors or Perception? where a camera sits',
    content: doc(para([
      'The poster stacks four application blocks (Navigation, Perception, Manipulation, Application) above ROS, and four hardware blocks (Sensors, Actuators, Hardware Drivers, Robot Platform) below it. A camera and a LIDAR belong to which block?',
    ])),
    options: [
      'Sensors — the hardware row that feeds raw data upward',
      'Perception — the application that makes sense of that data',
      'Navigation — the application that plans where to go',
      'ROS middleware — the layer that carries the messages',
    ],
    answer: [0],
    explanation: doc(para([
      'Perception is the application that turns images into "there is a chair over there"; the camera and the LIDAR are what produce those raw images in the first place, so they sit in the hardware row. The two are easy to confuse because the poster pairs the word Perception with a camera icon, but the icon means what the block does, not what it is.',
    ])),
  },
  {
    cid: 113,
    type: 'multiple',
    name: '🧩 Which three are listed as Key Features',
    content: doc(para([
      'The Key Features row names five properties of ROS. Which THREE of these are actually on the poster?',
    ])),
    options: [
      'Open source — free to use, share and improve',
      'Modular design — reusable components, easy to extend',
      'Multi-platform — works on Linux, Windows and macOS',
      'Comes with its own robot arm in the box',
      'Replaces Python as the language you program in',
      'Only supports one brand of camera and one brand of motor',
    ],
    answer: [0, 1, 2],
    explanation: doc(para([
      'ROS is a framework, not hardware and not a language: it is installed on top of the operating system you already have, and it drives whatever sensors and motors you attach. The other two real features on the poster are a large community and a wide ecosystem of packages — neither of which needs a particular brand of anything.',
    ])),
  },
  {
    cid: 114,
    type: 'fill',
    name: '📮 The block every message passes through',
    content: doc(para([
      'Nothing on the poster talks to anything else directly. Every message passes through the ROS ',
      { blank: '[Mm]iddleware' },
      ', the block in the middle that knows the name of each channel and forwards the data.',
    ])),
    options: ['regex'],
    answer: ['[Mm]iddleware'],
    explanation: doc(para([
      'That block is the whole point of ROS: a program that reads the camera and a program that steers the wheels do not know about each other, they only know the name of the channel between them. Change the motor and only the driver changes; the navigation code keeps working.',
    ])),
  },
]

/* ------------------------------------------------------------------ login */
const login = await fetch(`${BASE}/api/auth/login`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ username: USER, password: PASS }),
})
const cookie = (login.headers.getSetCookie?.() || []).map((c) => c.split(';')[0]).join('; ')
if (!login.ok || !cookie) {
  console.error('login failed', login.status)
  process.exit(1)
}

const flatten = (d) => d.content.map((p) => p.content.map((c) => (c.type === 'inputs' ? `[[${c.attrs.content}]]` : c.text)).join('')).join('\n')

if (DRY) {
  QS.forEach((q) => {
    console.log(`\n[cid ${q.cid}] ${q.type.toUpperCase()}  ${q.name}`)
    console.log(flatten(q.content))
    if (q.type !== 'fill') q.options.forEach((o, i) => console.log(`  ${q.answer.includes(i) ? '[x]' : '[ ]'} ${o}`))
    else console.log(`  answer: ${q.answer[0]}`)
    console.log('  why: ' + flatten(q.explanation).slice(0, 90) + '…')
  })
  process.exit(0)
}

/* ----------------------------------------------------------------- update */
for (const q of QS) {
  const res = await fetch(`${BASE}/api/questions/update`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: cookie },
    body: JSON.stringify({
      course_id: COURSE,
      id: q.cid,
      name: q.name,
      type: q.type,
      content: q.content,
      options: q.options,
      answer: q.answer,
      explanation: q.explanation,
      point: 5,
      difficulty: 1,
      tags: ['G9', 'ROS', 'poster', q.type],
    }),
  })
  const body = await res.text()
  console.log(`cid ${q.cid}: ${res.status} ${body.slice(0, 90)}`)
  if (!res.ok) process.exit(1)
}

/* ----------------------------------------------------------------- verify */
const back = await fetch(`${BASE}/api/chapters/show?id=201`, { headers: { Cookie: cookie } })
const payload = await back.json()
// question_ids lives next to the chapter, not inside it
const qids = payload?.data?.question_ids ?? payload?.question_ids
const nodes = payload?.data?.chapter?.content?.content || []
const qNodes = nodes.filter((n) => n.type === 'vue' && n.attrs?.type === 'question').map((n) => n.attrs.content)
console.log(`\nchapter 201: ${nodes.length} nodes, question nodes ${qNodes.join(', ')}`)
console.log('question_ids in payload:', qids ? JSON.stringify(qids) : '(not returned by this endpoint)')
