/**
 * Five questions for course 4 / chapter 178 (Image Classifier), covering
 * chapters 175 (laser cutting), 176 (assembly), 177 (training) and 178.
 *
 *   node questions.mjs --dry   # print what would be created, touch nothing
 *   node questions.mjs         # create the questions and append them to 178
 */
const BASE = process.env.LMS || 'http://10.28.1.151'
const USER = process.env.LMS_USER || 'admin'
if (!process.env.LMS_PASS) throw new Error('请设置 LMS_PASS 环境变量（LMS 管理员密码）')
const PASS = process.env.LMS_PASS
const COURSE = 4
const CHAPTER = 178
const DRY = process.argv.includes('--dry')

/* ---------------------------------------------------------------- helpers */
const PA = { indent: null, margin: null, wordWrap: 'normal', textAlign: null, indentUnit: null, lineHeight: 1.75 }
let seq = 0
const nid = () => 'q4' + (seq++).toString(36) + Math.random().toString(36).slice(2, 5)

const doc = (text) => ({
  type: 'doc',
  content: [{ type: 'paragraph', attrs: { ...PA }, content: [{ type: 'text', text }] }],
})
const heading = (level, text) => {
  const id = nid()
  return {
    type: 'heading',
    attrs: { id, level, ...PA, 'data-toc-id': id },
    content: [{ type: 'text', text, marks: [{ type: 'bold' }] }],
  }
}
const para = (text) => ({ type: 'paragraph', attrs: { ...PA }, content: [{ type: 'text', text }] })
const questionNode = (cid) => ({ type: 'vue', attrs: { type: 'question', height: null, content: String(cid) } })

/* -------------------------------------------------------------- questions */
const QS = [
  {
    name: 'G81 P2 STEAM1 AC4 Q1 project order',
    type: 'sort',
    content: 'The four stages of the herbal sorting machine are listed below in the order you actually do them. Drag them into that order.',
    options: [
      'Cut the flat parts and the four herb boxes on the laser cutter (Chapter 175)',
      'Assemble the arm with the ESP32 and the servos, then check every pin (Chapter 176)',
      'Photograph each herb, label four categories and train the model (Chapter 177)',
      'Test with photos the model has never seen, then add the weak categories and retrain (Chapter 178)',
    ],
    answer: [0, 1, 2, 3],
    explanation: 'Nothing can be trained before the machine exists, and nothing can be trusted before it is tested on photos it has not seen. Each stage hands a finished thing to the next one: parts, then a working arm, then a model, then a measured accuracy.',
  },
  {
    name: 'G81 P2 STEAM1 AC4 Q2 what pushes the herb',
    type: 'single',
    content: 'The classifier has just answered "当归 (Angelica)". Which part actually moves that herb into the 当归 box?',
    options: [
      'A servo arm, driven by a PWM signal from the ESP32',
      'The camera, which slides along the rail to the correct box',
      'The trained model itself, because it already knows the category',
      'The laser cutter, which cuts a new slot for each category',
    ],
    answer: [0],
    explanation: 'The camera only looks and the model only decides. Turning a decision into movement is the job of the servo, and the ESP32 is what converts the answer into a pulse width.',
  },
  {
    name: 'G81 P2 STEAM1 AC4 Q3 training accuracy',
    type: 'judge',
    content: 'The training set holds 200 photos and the model recognises every one of them correctly. So it will recognise a new photo of the same herb just as reliably.',
    options: ['✓ Correct', '✗ Wrong'],
    answer: [1],
    explanation: 'Getting all 200 training photos right can simply mean the model memorised them. Only photos it has never seen during training measure real accuracy - which is why Activity 4 tests with a separate set instead of the training set.',
  },
  {
    name: 'G81 P2 STEAM1 AC4 Q4 two herbs look alike',
    type: 'multiple',
    content: 'The model keeps mixing up two herbs that look alike. Which THREE actions are most likely to help?',
    options: [
      'Add more photos of those two herbs, especially from the angles and lighting where they look alike',
      'Lower the accuracy target on the test screen until the number looks acceptable',
      'Shoot the whole set at the same distance, with the same background and light, so the only difference left is the herb itself',
      'Delete the test photos the model gets wrong',
      'Add samples that show the clue a pharmacist actually uses: colour, texture, the shape of the slice',
    ],
    answer: [0, 2, 4],
    explanation: 'A classifier can only learn from what the photos show. More samples of the confusing pair, a cleaner and more consistent set, and samples that make the real difference visible all add information. Changing the pass mark or deleting the failures only hides the problem.',
  },
  {
    name: 'G81 P2 STEAM1 AC4 Q5 what each chapter delivers',
    type: 'match',
    content: 'Match each chapter of the project to what it hands to the next one.',
    options: [
      { left: 'Chapter 175 - laser cutting', right: 'Flat parts and four herb boxes cut from a vector file such as .lcpx' },
      { left: 'Chapter 176 - assembly', right: 'ESP32, servos and wiring fixed in place, with every pin checked' },
      { left: 'Chapter 177 - image training', right: 'Four labelled photo categories and a first trained model' },
      { left: 'Chapter 178 - classifier', right: 'Accuracy measured on unseen photos, then categories added and retrained' },
    ],
    answer: [0, 1, 2, 3],
    explanation: 'The project is a chain, and every link is testable on its own: a cut part fits or it does not, a servo moves when told to, a model trains without errors, an accuracy number comes from photos it never saw.',
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
  QS.forEach((q, i) => console.log(`[${i + 1}] ${q.type.padEnd(8)} ${q.name}\n    ${q.content}`))
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
      tags: ['G8', 'P2', 'STEAM1', 'AC4', q.type],
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

/* --------------------------------------------------- append to chapter 178 */
const show = await fetch(`${BASE}/api/chapters/show?id=${CHAPTER}`, { headers: { Cookie: cookie } })
const ch = (await show.json()).data.chapter
const content = ch.content
if (!Array.isArray(content.content)) {
  console.error('chapter 178 content is not a doc')
  process.exit(1)
}

// idempotent: the section always sits at the tail, so cut from its heading onwards
const marker = '📝 Check Your Understanding'
const cut = content.content.findIndex((n) => n.type === 'heading' && JSON.stringify(n).includes(marker))
if (cut >= 0) content.content = content.content.slice(0, cut)

content.content.push(heading(2, marker))
content.content.push(para('Five questions on the last four chapters: the laser-cut parts, the assembled arm, the training set and the classifier itself. Answer them after Activity 4, before you extend the model.'))
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
console.log('trailing nodes:', nodes.slice(-2).map((n) => n.type + (n.content ? ':' + JSON.stringify(n.content).slice(0, 60) : '')).join(' | '))
