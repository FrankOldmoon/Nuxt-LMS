/**
 * Nine questions for course 4 / chapter 185 ("AR & VR"), written from the five
 * posters in that chapter:
 *
 *   1. Augmented Reality  - what it is, how it works, key technologies, uses
 *   2. Virtual Reality    - headset + computer, 360 immersion, uses
 *   3. Mixed Reality      - anchoring, blending, real-time realism
 *   4. Meta Quest 3       - the headset the class actually uses
 *   5. AI with AR/VR/MR   - three columns, four AI powers, five industries
 *
 * Question types: classify, match, fill x2, single x2, multiple, judge, sort.
 *
 *   node questions.mjs --dry   # print them, touch nothing
 *   node questions.mjs         # create and append to chapter 185
 */
const BASE = process.env.LMS || 'http://10.28.1.151'
const USER = process.env.LMS_USER || 'admin'
if (!process.env.LMS_PASS) throw new Error('请设置 LMS_PASS 环境变量（LMS 管理员密码）')
const PASS = process.env.LMS_PASS
const COURSE = 4
const CHAPTER = 185
const DRY = process.argv.includes('--dry')

/* ---------------------------------------------------------------- helpers */
const PA = { indent: null, margin: null, wordWrap: 'normal', textAlign: null, indentUnit: null, lineHeight: 1.75 }
let seq = 0
const nid = () => 'q185' + (seq++).toString(36) + Math.random().toString(36).slice(2, 5)

const doc = (text) => ({
  type: 'doc',
  content: [{ type: 'paragraph', attrs: { ...PA }, content: [{ type: 'text', text }] }],
})
const heading = (level, text) => {
  const id = nid()
  return { type: 'heading', attrs: { id, level, ...PA, 'data-toc-id': id }, content: [{ type: 'text', text, marks: [{ type: 'bold' }] }] }
}
const para = (text) => ({ type: 'paragraph', attrs: { ...PA }, content: [{ type: 'text', text }] })
const questionNode = (cid) => ({ type: 'vue', attrs: { type: 'question', height: null, content: String(cid) } })

/** A fill-in-the-blank body: text runs plus `inputs` nodes, one per answer. */
const blanks = (lines) => ({
  type: 'doc',
  content: lines.map((line) => ({
    type: 'paragraph',
    attrs: { ...PA },
    content: line.map((part) =>
      typeof part === 'string'
        ? { type: 'text', text: part }
        : { type: 'inputs', attrs: { content: part.blank } },
    ),
  })),
})

/* -------------------------------------------------------------- questions */
const QS = [
  {
    name: 'AR/VR Q1 classify nine tasks into AR VR MR',
    type: 'classify',
    content:
      'Each poster claims its own set of applications. Sort the nine tasks below into the technology that really does them.',
    options: [
      {
        name: 'AR - added on top of the real world',
        items: [
          'Arrows drawn on the road ahead while you hold up a phone',
          'A virtual sofa dropped into your own living room through the camera',
          'A game character standing on the pavement in front of you',
        ],
      },
      {
        name: 'VR - the real world replaced',
        items: [
          'Practising surgery in a headset, with no patient and no operating theatre',
          'A 360 degree tour of the Eiffel Tower while you stand in a classroom',
          'A roller-coaster ride while sitting perfectly still',
        ],
      },
      {
        name: 'MR - real and virtual in one space',
        items: [
          'Assembly instructions floating over the engine you are repairing',
          'A dinosaur that stays on the same classroom floor tiles while you walk around it',
          'Two people in different cities moving the same 3D model on the table between them',
        ],
      },
    ],
    answer: [0, 0, 0, 1, 1, 1, 2, 2, 2],
    explanation:
      'Ask one question of each task: can you still see the room? AR adds to it, VR replaces it, and MR keeps it and lets the digital object collide with, hide behind, or stay stuck to real things. The surgery drill and the Eiffel Tower tour work precisely because the room is gone; the dinosaur and the engine instructions only work because the room is not.',
  },
  {
    name: 'AR/VR Q2 match four key technologies of AR',
    type: 'match',
    content: 'The AR poster lists four key technologies. Match each one to the job it does in the pipeline.',
    options: [
      { left: 'Sensors (Camera)', right: 'Captures the real world as a stream of images' },
      { left: 'Tracking', right: 'Works out where the device is and how it is moving' },
      { left: '3D Graphics (Rendering)', right: 'Draws the digital object so it sits in the right place' },
      { left: 'AI (Intelligence)', right: 'Recognises what the scene contains and what it means' },
    ],
    answer: [0, 1, 2, 3],
    explanation:
      'The four run in that order: an image arrives, tracking turns it into a position, rendering draws at that position, and AI decides what to draw. Take any one away and the overlay either does not appear, drifts, looks pasted on, or shows the wrong thing.',
  },
  {
    name: 'AR/VR Q3 fill three steps of AR',
    type: 'fill',
    content: blanks([
      ['The AR poster reduces the whole pipeline to three steps. Complete them with the words the poster uses.',],
      ['1. The camera ', { blank: 'captures' }, ' the real world.',],
      ['2. The app ', { blank: 'overlays' }, ' digital content on top of it.',],
      ['3. You see both ', { blank: 'together' }, ' in one view.',],
    ]),
    options: ['', '', ''],
    answer: ['captures', 'overlays', 'together'],
    explanation:
      'Step 3 is the whole point of calling it augmented: the real view never disappears, so the two images have to be aligned well enough that they look like one scene rather than a sticker on a photograph.',
  },
  {
    name: 'AR/VR Q4 single the real difference between AR and VR',
    type: 'single',
    content: 'Both posters promise a more immersive world. What is the essential difference between AR and VR?',
    options: [
      'AR adds digital content on top of the real world, while VR replaces the real world with a computer-generated one',
      'AR needs a headset, while VR works on any phone',
      'AR is three-dimensional, while VR is only two-dimensional video',
      'VR can only be used for games, while AR can only be used for education',
    ],
    answer: [0],
    explanation:
      'The posters say it in one line each: AR blends the real world with digital magic, VR lets you step inside a new world. Both are three-dimensional, both run on phones or headsets, and both appear in education and in games - so only the first statement survives.',
  },
  {
    name: 'AR/VR Q5 single dinosaur on the classroom floor',
    type: 'single',
    content:
      'A dinosaur stands on the classroom floor. You walk around it, it stays on the same floor tiles, and when you step behind a real desk it is hidden by the desk. Which technology is this, and why?',
    options: [
      'MR, because the digital object is anchored to real space and is occluded by real objects',
      'AR, because you can see it through a camera',
      'VR, because you are wearing a headset',
      'Ordinary video, because the dinosaur must have been filmed earlier',
    ],
    answer: [0],
    explanation:
      'Staying put is spatial anchoring; being hidden by the desk is occlusion, and both require the device to understand the room. That is the difference between MR and a video played on top of a camera picture, which would slide around as you move.',
  },
  {
    name: 'AR/VR Q6 multiple four abilities AI brings to XR',
    type: 'multiple',
    content: 'The last poster says AI powers AR, VR and MR. Which FOUR abilities does it list?',
    options: ['Intelligent recognition', 'Personalised experience', 'Natural interaction', 'Smart prediction', 'Manual keyframe animation', 'Printing holograms on paper'],
    answer: [0, 1, 2, 3],
    explanation:
      'Recognition decides what is in front of you, natural interaction lets you use hands and voice instead of menus, personalisation adapts the content to you, and prediction prepares what you will need next. Keyframes and printing are not AI at all.',
  },
  {
    name: 'AR/VR Q7 judge Quest 3 can only do VR',
    type: 'judge',
    content:
      'The Meta Quest 3 in the poster is sold as a VR headset, so it can only show VR content and can never show AR or MR.',
    options: ['✓ Correct', '✗ Wrong'],
    answer: [1],
    explanation:
      'The headset has colour passthrough cameras, so it can also let you see the room and place digital objects in it - which is MR. VR is one mode of the device, not its only mode. The MR poster makes the same point: real world plus digital content goes into an MR headset.',
  },
  {
    name: 'AR/VR Q8 fill two parts of a VR system',
    type: 'fill',
    content: blanks([
      ['A VR system is two pieces of hardware and the content between them. Fill in from the VR poster.',],
      ['A head-mounted ', { blank: 'display' }, ' puts two screens in front of your eyes.',],
      ['A ', { blank: 'computer' }, ' renders the 3D graphics in real time, fast enough to keep up with your head.',],
    ]),
    options: ['', ''],
    answer: ['display', 'computer'],
    explanation:
      'The headset only shows; the computer produces. That split is why a phone can run simple VR and a PC-based headset needs a cable or a fast wireless link - the rendering is the expensive half.',
  },
  {
    name: 'AR/VR Q9 sort three steps of one AR frame',
    type: 'sort',
    content: 'Put the three steps of a single AR frame into the order the poster shows them.',
    options: ['Capture the real world with the camera', 'Overlay the digital content', 'See the two together on screen'],
    answer: [0, 1, 2],
    explanation:
      'Capture has to come first because everything else needs the current view; overlay needs a known position, which comes from that captured frame; and the result is only shown once both images exist.',
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

if (DRY) {
  QS.forEach((q, i) => {
    console.log(`\n[${i + 1}] ${q.type.toUpperCase()}  ${q.name}`)
    if (typeof q.content === 'string') console.log('  ' + q.content)
    else {
      q.content.content.forEach((p) => {
        const line = p.content.map((c) => (c.type === 'inputs' ? `[[${c.attrs.content}]]` : c.text)).join('')
        console.log('  ' + line)
      })
    }
    if (q.type === 'classify') q.options.forEach((g) => console.log(`  * ${g.name}: ${g.items.length} items`))
    if (q.type === 'match') q.options.forEach((p) => console.log(`  * ${p.left} -> ${p.right}`))
    if (Array.isArray(q.options) && typeof q.options[0] === 'string' && q.type !== 'fill') {
      q.options.forEach((o, k) => console.log(`  ${q.answer.includes(k) ? '[x]' : '[ ]'} ${o}`))
    }
    console.log('  answer: ' + JSON.stringify(q.answer))
  })
  console.log(`\n${QS.length} questions, chapter ${CHAPTER}, course ${COURSE} (dry)`)
  process.exit(0)
}

/* -------------------------------------------------------------- create them */
const cids = []
for (const q of QS) {
  const res = await fetch(`${BASE}/api/questions/add`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: cookie },
    body: JSON.stringify({
      course_id: COURSE,
      name: q.name,
      type: q.type,
      content: q.content,
      options: q.options,
      answer: q.answer,
      explanation: doc(q.explanation),
      point: 1,
      difficulty: 1,
      tags: ['G10', 'ARVR', 'XR', q.type],
    }),
  })
  const body = await res.json()
  if (!body?.success) {
    console.error('add failed:', q.name, JSON.stringify(body).slice(0, 300))
    process.exit(1)
  }
  cids.push(body.data.cid)
  console.log(`+ cid ${body.data.cid}  ${q.type.padEnd(8)} ${q.name}`)
}

/* --------------------------------------------------- append to chapter 185 */
const show = await fetch(`${BASE}/api/chapters/show?id=${CHAPTER}`, { headers: { Cookie: cookie } })
const ch = (await show.json()).data.chapter
const content = ch.content
if (!Array.isArray(content.content)) {
  console.error('chapter 185 content is not a doc')
  process.exit(1)
}

// idempotent: the section always sits at the tail, so cut from its heading onwards
const marker = '📝 Check Your Understanding'
const cut = content.content.findIndex((n) => n.type === 'heading' && JSON.stringify(n).includes(marker))
if (cut >= 0) content.content = content.content.slice(0, cut)
// the chapter ended with an empty paragraph; a question block should not sit after one
while (content.content.length && content.content[content.content.length - 1].type === 'paragraph' &&
       !JSON.stringify(content.content[content.content.length - 1].content || []).match(/"text":"[^"]/)) {
  content.content.pop()
}

content.content.push(heading(2, marker))
content.content.push(para('Nine questions on the five posters: AR, VR, MR, the Quest 3 headset, and what AI adds to all three. Answer them after Activity 5.'))
for (const cid of cids) content.content.push(questionNode(cid))

const upd = await fetch(`${BASE}/api/chapters/update`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json', Cookie: cookie },
  body: JSON.stringify({ id: CHAPTER, content }),
})
const updBody = await upd.text()
console.log('chapter update:', upd.status, updBody.slice(0, 200))
if (!upd.ok) process.exit(1)

/* ----------------------------------------------------------------- verify */
const back = await fetch(`${BASE}/api/chapters/show?id=${CHAPTER}`, { headers: { Cookie: cookie } })
const after = (await back.json()).data.chapter
const nodes = after.content.content
const qNodes = nodes.filter((n) => n.type === 'vue' && n.attrs?.type === 'question')
console.log(`\nchapter ${after.id} "${after.title}" - ${nodes.length} nodes, ${qNodes.length} question nodes: ${qNodes.map((n) => n.attrs.content).join(', ')}`)
console.log('cids created:', cids.join(', '))
