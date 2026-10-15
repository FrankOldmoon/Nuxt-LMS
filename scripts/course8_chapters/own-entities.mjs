/**
 * Create the course-8-native entities used by Ac1 (screenshot homework) and
 * Ac2 (poster questions + discussion) of chapters 198-201.
 * Idempotent: reuses an existing row with the same name.
 */
import { writeFileSync } from 'node:fs'
import postgres from '/Users/oldmoon/Documents/ubuntu/nuxt_lms_2026/node_modules/postgres/src/index.js'

const BASE = 'http://10.28.1.151'
const log = (...a) => console.log(...a)
let TOKEN = ''
async function api (p, method = 'GET', body) {
  const r = await fetch(BASE + p, {
    method,
    headers: { 'Content-Type': 'application/json', ...(TOKEN ? { Cookie: `auth_token=${TOKEN}` } : {}) },
    body: body === undefined ? undefined : JSON.stringify(body),
  })
  const d = await r.json().catch(() => ({}))
  if (!d.success) throw new Error(`${method} ${p}: ${d.msg || r.status}`)
  return d.data
}
const sql = postgres(process.env.PG, { idle_timeout: 5, max: 1 })

const PA = { indent: null, margin: null, wordWrap: 'normal', textAlign: null, indentUnit: null, lineHeight: 1.75 }
/** Build a doc from an array of strings (or [text, marks] tuples). */
function docOf (paras) {
  return {
    type: 'doc',
    content: paras.map(p => {
      const parts = Array.isArray(p) ? p : [p]
      return {
        type: 'paragraph',
        attrs: { ...PA },
        content: parts.map(([text, marks]) => ({
          type: 'text', text, ...(marks ? { marks } : {}),
        })),
      }
    }),
  }
}
const b = (t) => [t, [{ type: 'bold' }]]

/* ------------------------------------------------------------------ data */

// Ac1 homework: one per chapter, asking for a screenshot of the demo.
const HOMEWORKS = [
  {
    key: '198',
    name: '📸 Screenshot of the humanoid robot structure demo',
    content: docOf([
      ['📷 Open the ', b('SOMA Humanoid Anatomy Atlas'), ' demo below and click through the robot body.'],
      ['📸 Take a ', b('screenshot'), ' that clearly shows the exploded view with the part names visible, then submit it here. ✅ The part names must be readable in your screenshot.'],
    ]),
  },
  {
    key: '199',
    name: '📸 Screenshot of the robot arm control demo',
    content: docOf([
      ['📷 Open the ', b('ReBot Arm Simulator'), ' below and drag the joints to move the arm.'],
      ['📸 Take a ', b('screenshot'), ' of the arm in a pose you chose, then submit it here. ✅ Your screenshot must show the joint angles you set.'],
    ]),
  },
  {
    key: '200',
    name: '📸 Screenshot of the autonomous driving demo',
    content: docOf([
      ['📷 Open the ', b('SmartTown Autonomous Driving'), ' demo below and let the car drive.'],
      ['📸 Take a ', b('screenshot'), ' that shows the car and its detected obstacles, then submit it here. ✅ The screenshot must show the driving view clearly.'],
    ]),
  },
  {
    key: '201',
    name: '📸 Screenshot of the five-robot lab',
    content: docOf([
      ['📷 Open the ', b('Five-Robot Lab'), ' demo below and switch between the robots.'],
      ['📸 Take a ', b('screenshot'), ' of the lab with one robot selected, then submit it here. ✅ The robot name must be visible in the screenshot.'],
    ]),
  },
]

// Ac2 questions: three per chapter (single / multiple / fill), course-8 style.
const QUESTIONS = [
  // ---------- 198 Robot Structure ----------
  {
    key: '198',
    name: '🦴 Which part of a robot turns a motor rotation into a joint movement?',
    content: docOf(['A robot arm has a motor spinning, but the link does not move. Which part is responsible for turning that rotation into an actual joint movement?']),
    type: 'single',
    options: ['The actuator', 'The sensor', 'The controller', 'The power supply'],
    answer: [0],
  },
  {
    key: '198',
    name: '🤖 Which of these are parts of a robot structure?',
    content: docOf(['Look at the humanoid robot demo. Which of the following belong to the ', b('structure'), ' of a robot?']),
    type: 'multiple',
    options: ['Link', 'Joint', 'End effector', 'Battery charger', 'Controller board'],
    answer: [0, 1, 2],
  },
  {
    key: '198',
    name: '🦾 What does the D in DoF stand for?',
    content: docOf(['A robot arm is described as having 6 ', b('DoF'), '. What does the D stand for?']),
    type: 'fill',
    content2: true,
    options: [''],
    answer: ['[Dd]egrees? of [Ff]reedom'],
  },
  // ---------- 199 Actuation and Control ----------
  {
    key: '199',
    name: '⚡ What does an actuator do in a robot?',
    content: docOf(['In the robot arm demo, one component has to push the joint to a new angle. What is that component called?']),
    type: 'single',
    options: ['The actuator', 'The encoder', 'The sensor', 'The gripper camera'],
    answer: [0],
  },
  {
    key: '199',
    name: '🔁 Which of these are ways to control a robot joint?',
    content: docOf(['Which of the following are ', b('control'), ' methods a robot uses to decide where a joint should move?']),
    type: 'multiple',
    options: ['Move to a target angle', 'Follow a speed limit', 'React to a collision', 'Print a report', 'Reboot the controller'],
    answer: [0, 1, 2],
  },
  {
    key: '199',
    name: '📡 What does a servo motor return to the controller?',
    content: docOf(['A servo motor is told "go to 90 degrees". What does it report back so the controller knows where it actually is?']),
    type: 'fill',
    content2: true,
    options: [''],
    answer: ['[Pp]osition'],
  },
  // ---------- 200 Auto-Drive ----------
  {
    key: '200',
    name: '🚗 What does a self-driving car use to see obstacles?',
    content: docOf(['In the autonomous driving demo the car must avoid obstacles. What does it use to detect them?']),
    type: 'single',
    options: ['Lidar and cameras', 'Only a compass', 'A microphone', 'The car radio'],
    answer: [0],
  },
  {
    key: '200',
    name: '🧠 Which of these are steps inside the auto-drive decision loop?',
    content: docOf(['Which of the following happen inside the ', b('decision loop'), ' that a self-driving car repeats again and again?']),
    type: 'multiple',
    options: ['Sense the surroundings', 'Decide what to do next', 'Control the steering and speed', 'Play a game', 'Turn off the engine'],
    answer: [0, 1, 2],
  },
  {
    key: '200',
    name: '🛑 What must the car do when it sees a person crossing?',
    content: docOf(['A pedestrian steps out in front of the car. What should the auto-drive system do first?']),
    type: 'fill',
    content2: true,
    options: [''],
    answer: ['([Ss]top|[Bb]rake|[Ss]low down)'],
  },
  // ---------- 201 ROS ----------
  {
    key: '201',
    name: '📡 What does the R in ROS stand for?',
    content: docOf(['ROS is the software layer that lets several robots work together. What does the R stand for?']),
    type: 'single',
    options: ['Robot', 'Remote', 'Radio', 'Runtime'],
    answer: [0],
  },
  {
    key: '201',
    name: '🔗 Which of these are parts of a ROS robot system?',
    content: docOf(['Which of the following belong to a ', b('ROS'), ' robot system?']),
    type: 'multiple',
    options: ['Node', 'Topic', 'Message', 'Wheel', 'Battery'],
    answer: [0, 1, 2],
  },
  {
    key: '201',
    name: '🗣️ What is the ROS word for a named channel that nodes use to send messages?',
    content: docOf(['In ROS, nodes do not talk to each other directly. They publish and subscribe to a named channel. What is that channel called?']),
    type: 'fill',
    content2: true,
    options: [''],
    answer: ['[Tt]opic'],
  },
]

// Ac2 discussion comment: one per chapter.
const COMMENTS = [
  {
    key: '198',
    name: '💬 Share your idea: robot structure',
    content: docOf([
      '🤔 Which part of a robot do you think is the hardest to design, and why?',
      '💬 Tell your idea below, and describe one real robot you have seen with that part.',
    ]),
  },
  {
    key: '199',
    name: '💬 Share your idea: actuation and control',
    content: docOf([
      '🤔 Would you rather build a robot arm that lifts heavy things, or one that moves very fast?',
      '💬 Tell your choice below and explain which joint and which motor you would use.',
    ]),
  },
  {
    key: '200',
    name: '💬 Share your idea: auto-drive',
    content: docOf([
      '🤔 Which is harder for a self-driving car: staying in its lane, or noticing a person crossing the road?',
      '💬 Explain your answer below, and say which sensor would help most.',
    ]),
  },
  {
    key: '201',
    name: '💬 Share your idea: Robot Operating System',
    content: docOf([
      '🤔 If several robots all use ROS, why is that useful? Give one example.',
      '💬 Write your answer below, and describe a robot you would like to build with ROS.',
    ]),
  },
]

/* ------------------------------------------------------------- insert */

TOKEN = (await api('/api/auth/login', 'POST', { username: 'admin', password: 'REDACTED' })).token
log('✔ logged in')

const ids = {}
const created = { homeworks: [], questions: [], comments: [] }

async function ensureHomework (h) {
  const ex = (await sql`select cid from homeworks where course_id=8 and name=${h.name} and deleted_at is null`)[0]
  if (ex) { log(`  = hw "${h.name.slice(0, 50)}" reuse cid ${ex.cid}`); return ex.cid }
  const row = await api('/api/homeworks/add', 'POST', {
    course_id: 8, name: h.name, content: h.content,
    explanation: { type: 'doc', content: [] }, point: 10, tags: [],
  })
  const cid = row.cid ?? row[0]?.cid
  created.homeworks.push({ cid, name: h.name })
  log(`  + hw cid ${cid}  ${h.name.slice(0, 54)}`)
  return cid
}

async function ensureQuestion (q) {
  const ex = (await sql`select cid from questions where course_id=8 and name=${q.name} and deleted_at is null`)[0]
  if (ex) { log(`  = q "${q.name.slice(0, 50)}" reuse cid ${ex.cid}`); return ex.cid }
  let content = q.content
  if (q.content2) {
    // fill-in: the stem needs an inputs node holding the answer
    content = {
      type: 'doc',
      content: [{
        type: 'paragraph',
        attrs: { ...PA },
        content: [
          { type: 'text', text: q.content.content[0].content[0].text + ' The answer is ' },
          { type: 'inputs', attrs: { content: q.answer[0] } },
          { type: 'text', text: '.' },
        ],
      }],
    }
  }
  const row = await api('/api/questions/add', 'POST', {
    course_id: 8, name: q.name, type: q.type,
    content, options: q.options, answer: q.answer,
    point: 5, difficulty: 1, tags: [],
    explanation: { type: 'doc', content: [] },
  })
  const cid = row.cid ?? row[0]?.cid
  created.questions.push({ cid, name: q.name, type: q.type })
  log(`  + q cid ${cid} [${q.type}] ${q.name.slice(0, 50)}`)
  return cid
}

async function ensureComment (c) {
  const ex = (await sql`select cid from comments where course_id=8 and name=${c.name} and deleted_at is null`)[0]
  if (ex) { log(`  = c "${c.name.slice(0, 50)}" reuse cid ${ex.cid}`); return ex.cid }
  const row = await api('/api/comments/add', 'POST', {
    course_id: 8, name: c.name, content: c.content, point: 5,
  })
  const cid = row.cid ?? row[0]?.cid
  created.comments.push({ cid, name: c.name })
  log(`  + c cid ${cid}  ${c.name.slice(0, 54)}`)
  return cid
}

for (const h of HOMEWORKS) {
  log(`\n[${h.key}] homework`)
  ids[h.key] = { hw: await ensureHomework(h) }
}
for (const q of QUESTIONS) {
  log(`\n[${q.key}] question`)
  ids[q.key] = ids[q.key] || {}
  ids[q.key].q = ids[q.key].q || []
  ids[q.key].q.push(await ensureQuestion(q))
}
for (const c of COMMENTS) {
  log(`\n[${c.key}] comment`)
  ids[c.key] = ids[c.key] || {}
  ids[c.key].c = await ensureComment(c)
}

log('\n=== ids ===')
console.log(JSON.stringify(ids, null, 1))
writeFileSync('/tmp/c8/own-ids.json', JSON.stringify({ ids, created }, null, 2))
log('\nwrote /tmp/c8/own-ids.json')

// final verification
let bad = 0
for (const [k, v] of Object.entries(ids)) {
  const hw = v.hw ? (await sql`select 1 from homeworks where course_id=8 and cid=${v.hw}`)[0] : true
  const cs = v.c ? (await sql`select 1 from comments where course_id=8 and cid=${v.c}`)[0] : true
  const qs = (v.q || []).map(() => true)
  for (const qid of v.q || []) if (!(await sql`select 1 from questions where course_id=8 and cid=${qid}`)[0]) bad++
  if (!hw || !cs) bad++
}
log(`verify: ${bad === 0 ? 'all own entities exist' : bad + ' MISSING'}`)
await sql.end()
