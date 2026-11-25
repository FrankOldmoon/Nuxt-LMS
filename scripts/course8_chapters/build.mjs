/**
 * Build chapters 198-201 in course 8 from templates 164-167.
 *
 * Ac1 (experience demo + screenshot homework) and Ac2 (questions + discussion)
 * are course-8-native; everything from Ac3 onward is copied from the template
 * with entity cids remapped to their course-8 clones.
 */
import { readFileSync, writeFileSync } from 'node:fs'

const BASE = 'http://10.28.1.151'
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
const log = (...a) => console.log(...a)

const cidmap = JSON.parse(readFileSync('/tmp/c8/cidmap.json', 'utf8')).QMAP
const own = JSON.parse(readFileSync('/tmp/c8/own-ids.json', 'utf8')).ids

/**
 * Template 167 references two homeworks that share the name "P2-H2"
 * (cid 5 = AI for Excel, cid 2 = create PPT), so the name-based dedupe in
 * clone.mjs merged them into one course-8 row. Point the Excel node at its own
 * homework instead, so both nodes keep the template's original meaning.
 */
const EXCEL_HW_CID = 10

/* ------------------------------------------------------------- helpers */

const PA = { indent: null, margin: null, wordWrap: 'normal', textAlign: null, indentUnit: null, lineHeight: 1.75 }
let idSeq = 0
const newId = () => 'rc8' + (idSeq++).toString(36).padStart(3, '0') + Math.random().toString(36).slice(2, 6)

const t = (text, marks) => ({ type: 'text', text, ...(marks ? { marks } : {}) })
const bold = (s) => t(s, [{ type: 'bold' }])
const p = (...kids) => ({
  type: 'paragraph',
  attrs: { ...PA },
  content: kids.map((k) => (typeof k === 'string' ? t(k) : k)),
})
/**
 * Ordered list. Each item may be a string, an inline node, or an array of
 * either (mixed strings and nodes are joined into one paragraph).
 */
const ol = (...items) => ({
  type: 'orderedList',
  attrs: { type: null, start: 1, margin: null, listType: 'decimal' },
  content: items.map((item) => {
    const kids = Array.isArray(item) ? item : [item]
    return {
      type: 'listItem',
      attrs: { indent: null, indentUnit: null },
      content: [{
        type: 'paragraph',
        attrs: { ...PA },
        content: kids.map((k) => (typeof k === 'string' ? t(k) : k)),
      }],
    }
  }),
})
/** Activity intro blockquote: one summary paragraph + one ordered list. */
const bq = (summary, steps) => ({
  type: 'blockquote',
  content: [p(summary), ol(...steps)],
})
const h2 = (text) => ({ type: 'heading', attrs: { level: 2, id: newId(), 'data-toc-id': null }, content: [bold(text)] })
const h3 = (text) => ({ type: 'heading', attrs: { level: 3, id: newId(), 'data-toc-id': null }, content: [bold(text)] })
const vue = (type, cid) => ({ type: 'vue', attrs: { type, content: String(cid) } })
const iframe = (src, height) => ({ type: 'iframe', attrs: { src, height: height || 520, type: 0, vnode: true, width: 553, margin: null, clickable: false, nodeAlign: 'center' } })

/** Table: first row is the header. */
const table = (head, rows) => ({
  type: 'table',
  content: [
    {
      type: 'tableRow',
      content: head.map((c) => ({
        type: 'tableHeader',
        attrs: { backgroundColor: 'rgb(242, 243, 245)' },
        content: [{ type: 'paragraph', attrs: { ...PA }, content: [bold(c)] }],
      })),
    },
    ...rows.map((r) => ({
      type: 'tableRow',
      content: r.map((c) => ({
        type: 'tableCell',
        content: [{ type: 'paragraph', attrs: { ...PA }, content: [t(c)] }],
      })),
    })),
  ],
})
const glossary = (terms) => table(['Term', 'Definition'], terms)

/* ------------------------------------------------ read source chapters */

const SRC = { 198: 164, 199: 165, 200: 166, 201: 167 }
TOKEN = (await api('/api/auth/login', 'POST', { username: 'admin', password: process.env.LMS_PASS })).token
log('✔ logged in')
const srcChapters = {}
for (const id of Object.values(SRC)) srcChapters[id] = (await api(`/api/chapters/show?id=${id}`)).chapter

/** Nodes of the template from Activity N to the end, cids remapped, ids regenerated. */
function tailFrom (chapter, srcId, fromActivity) {
  const nodes = chapter.content.content
  const txt = (n) => {
    if (!n || typeof n !== 'object') return ''
    if (n.type === 'text') return n.text || ''
    const c = n.content
    if (Array.isArray(c)) return c.map(txt).join('')
    if (c && typeof c === 'object') return txt(c)
    return ''
  }
  const idx = []
  nodes.forEach((n, i) => {
    if (n.type === 'heading' && n.attrs?.level === 2 && /Activity \d/.test(txt(n))) idx.push(i)
  })
  const cut = idx[fromActivity - 1]
  if (cut === undefined) throw new Error(`${srcId}: no Activity ${fromActivity}`)

  const clone = (n) => {
    const c = JSON.parse(JSON.stringify(n))
    const fix = (x) => {
      if (!x || typeof x !== 'object') return
      if (x.type === 'heading') {
        const id = newId()
        x.attrs = { ...(x.attrs || {}), id, 'data-toc-id': id }
        // ensure the heading text is bold
        for (const kid of x.content || []) {
          if (kid.type === 'text' && !(kid.marks || []).some((m) => m.type === 'bold')) {
            kid.marks = [...(kid.marks || []), { type: 'bold' }]
          }
        }
      }
      if (x.type === 'vue' && ['question', 'homework', 'comment'].includes(x.attrs?.type)) {
        const key = `${srcId}:${x.attrs.type}:${x.attrs.content}`
        if (!cidmap[key]) throw new Error(`no cid mapping for ${key}`)
        x.attrs.content = cidmap[key]
      }
      if (Array.isArray(x.content)) x.content.forEach(fix)
      else if (x.content && typeof x.content === 'object') fix(x.content)
    }
    fix(c)
    return c
  }
  return nodes.slice(cut).map(clone)
}

/* --------------------------------------------------- course-8 own parts */

const OWN = {
  198: {
    title: 'Robot Structure',
    demo: { src: 'https://10.28.1.152/robot/rebot-arm', height: 620 },
    demoName: 'ReBot Arm Simulator',
    intro: 'In this chapter you will find out how a robot is put together, from the links and joints that form its body to the degrees of freedom that decide how it can move.',
    points: [
      '🎬 Try the robot structure demo and submit a screenshot.',
      '🧠 Answer three questions about robot links, joints and degrees of freedom.',
      '💡 Learn how Python chooses between two paths.',
      '🧮 Finish five OJ problems about branch structure.',
      '🏆 Run the code on your own computer.',
    ],
    objectives: [
      '🎬 Experience a robot structure demo and see how links and joints work together.',
      '🧠 Understand the parts of a robot body and what DoF means.',
      '💡 Understand Python branching structures with else and elif.',
      '🧮 Finish programming exercises about branch structure.',
      '🏆 (Extra) Run the code on your own computer.',
    ],
    glossary: [
      ['🦾 Robot Structure', 'The set of links, joints and end effectors that give a robot its physical shape.'],
      ['🔗 Link', 'A rigid bar between two joints that carries load through the robot body.'],
      ['⚙️ Joint', 'A movable connection between two links that allows one part to rotate relative to the other.'],
      ['🔢 Degree of Freedom', 'One independent way a joint or link can move within the workspace of a robot.'],
      ['🦾 End Effector', 'The tool at the end of a robot arm, such as a gripper or a suction cup.'],
      ['📐 Workspace', 'The whole volume of space that the end effector of a robot can reach.'],
    ],
    ac1: { title: 'Robot Structure Demo', summary: '🎬 One robot arm demo: see how links and joints form a body.', steps: ['🎬 Open the demo below and run it.', '🔍 Drag the joints and watch the arm move.', '📸 Submit a screenshot of the pose you made.'] },
    ac2: { title: 'Robot Structure Questions', summary: '🖼️ Three questions about robot parts and degrees of freedom.', steps: ['📖 Read each question carefully.', '🧠 Answer all three questions.', '💬 Share your idea with the class.'] },
  },
  199: {
    title: 'Actuation and Control',
    demo: { src: 'https://10.28.1.152/robot/uaibot-kinematics', height: 620 },
    demoName: 'Robot Arm Kinematics',
    intro: 'In this chapter you will find out how a robot turns a decision into movement, and how motors, actuators and feedback keep a joint at the angle you asked for.',
    points: [
      '🎬 Try the robot arm control demo and submit a screenshot.',
      '🧠 Answer three questions about actuators and control methods.',
      '💡 Learn how Python nests one branch inside another.',
      '🧮 Finish four OJ problems about nested branches.',
      '🏆 Run the code on your own computer.',
    ],
    objectives: [
      '🎬 Experience a robot arm control demo and see how a joint is driven to a target angle.',
      '🧠 Understand what an actuator does and how the controller knows where a joint is.',
      '💡 Understand Python nested branch structure.',
      '🧮 Finish programming exercises about Python branches.',
      '🏆 (Extra) Run the code on your own computer.',
    ],
    glossary: [
      ['⚡ Actuator', 'The component that converts stored energy into movement, such as a motor or a pneumatic cylinder.'],
      ['🎯 Target Angle', 'The joint position a controller asks an actuator to reach, in degrees.'],
      ['📡 Feedback', 'A measurement returned by a sensor so a controller can correct the difference from the target.'],
      ['🔁 PID Control', 'A control method that uses the error, its accumulated history and its rate of change to compute a correction.'],
      ['⏱️ Response Time', 'How long the system takes to react after the target value has changed.'],
      ['🛑 Saturation', 'The point where the actuator has reached the most it can do and cannot deliver a larger command.'],
    ],
    ac1: { title: 'Actuation and Control Demo', summary: '🎬 One arm control demo: drive a joint and watch the controller correct it.', steps: ['🎬 Open the demo below and run it.', '🔍 Set a target angle and watch the arm reach it.', '📸 Submit a screenshot of the pose you made.'] },
    ac2: { title: 'Actuation and Control Questions', summary: '🖼️ Three questions about actuators, control methods and feedback.', steps: ['📖 Read each question carefully.', '🧠 Answer all three questions.', '💬 Share your idea with the class.'] },
  },
  200: {
    title: 'Auto-Drive',
    demo: null, // uses the embedded html demo already in the chapter
    demoName: 'SmartTown Autonomous Driving',
    intro: 'In this chapter you will find out how a self-driving car decides what to do next, and how the same sense-think-act loop is written in Python while loops.',
    points: [
      '🎬 Try the autonomous driving demo and submit a screenshot.',
      '🧠 Answer three questions about sensing, deciding and acting.',
      '💡 Learn how Python while keeps a loop running.',
      '🧮 Finish three OJ problems about while loops.',
      '🏆 Run the code on your own computer.',
    ],
    objectives: [
      '🎬 Experience an autonomous driving demo and see the sense-think-act loop working.',
      '🧠 Understand how a self-driving car detects obstacles and chooses an action.',
      '💡 Understand Python while syntax.',
      '🧮 Finish programming exercises about Python while.',
      '🏆 (Extra) Run the code on your own computer.',
    ],
    glossary: [
      ['🤖 Auto-Drive', 'A vehicle system that drives itself by sensing its surroundings and acting on what it senses.'],
      ['🔁 Sense-Think-Act Loop', 'The repeating cycle in which a robot senses the world, decides what to do, then acts.'],
      ['📡 Perception', 'The stage that turns raw sensor readings into an understanding of the environment.'],
      ['🛣️ Planning', 'The stage that decides which path the vehicle should follow to reach its goal safely.'],
      ['🛑 Emergency Stop', 'The control action that brakes a vehicle immediately when a person or obstacle enters its path.'],
      ['⏱️ Frame Rate', 'How many times per second the sense-think-act loop repeats, measured in frames per second.'],
    ],
    ac1: { title: 'Auto-Drive Demo', summary: '🎬 One driving demo: watch the car sense, decide and act.', steps: ['🎬 Open the demo below and run it.', '🔍 Watch the car detect an obstacle and brake.', '📸 Submit a screenshot of the driving view.'] },
    ac2: { title: 'Auto-Drive Questions', summary: '🖼️ Three questions about sensing, deciding and acting.', steps: ['📖 Read each question carefully.', '🧠 Answer all three questions.', '💬 Share your idea with the class.'] },
  },
  201: {
    title: 'Robot Operating System (ROS)',
    demo: { src: 'https://10.28.1.152/robot/embodied', height: 620 },
    demoName: 'Five-Robot Lab',
    intro: 'In this chapter you will find out how ROS lets several robots and programs cooperate, and how a break statement controls the flow of a Python program.',
    points: [
      '🎬 Try the five-robot lab demo and submit a screenshot.',
      '🧠 Answer three questions about nodes, topics and messages.',
      '💡 Learn how Python break stops a loop early.',
      '📊 Use AI for Excel to make your own data table.',
      '📽️ Build a slide deck, then finish two extra OJ problems.',
    ],
    objectives: [
      '🎬 Experience a multi-robot lab and see how robots exchange information.',
      '🧠 Understand the basic ideas of ROS: nodes, topics and messages.',
      '💡 Understand Python break statement.',
      '📊 Experience AI Office for Excel.',
      '🤖 Create presentation PPTs and finish two more OJ problems.',
    ],
    glossary: [
      ['🤖 Robot Operating System', 'A software framework that lets many robot programs run together and exchange data.'],
      ['🟢 Node', 'One independent program inside a ROS system that does a single job.'],
      ['🗣️ Topic', 'A named channel that carries messages between nodes, much like a message board.'],
      ['📨 Message', 'The data sent over a topic, holding the values one node wants another node to know.'],
      ['🧭 Launch File', 'A file that starts a whole group of nodes together with their settings.'],
      ['🔌 Interface', 'The shared convention that lets two nodes talk without knowing how the other is built.'],
    ],
    ac1: { title: 'ROS Five-Robot Lab', summary: '🎬 One multi-robot lab: see how several robots work as one system.', steps: ['🎬 Open the demo below and run it.', '🔍 Switch between the robots and watch the lab react.', '📸 Submit a screenshot with one robot selected.'] },
    ac2: { title: 'ROS Questions', summary: '🖼️ Three questions about nodes, topics and messages.', steps: ['📖 Read each question carefully.', '🧠 Answer all three questions.', '💬 Share your idea with the class.'] },
  },
}

/* --------------------------------------------------------- build each */

const results = []

for (const [chId, srcId] of Object.entries(SRC)) {
  const o = OWN[chId]
  const key = chId
  const src = srcChapters[srcId]
  const nodes = src.content.content
  let ownDemoNode = null

  // keep the existing html demo node from the target chapter (198 / 200)
  if (!o.demo) {
    const cur = (await api(`/api/chapters/show?id=${chId}`)).chapter.content.content
    const walk = (n) => {
      if (!n || typeof n !== 'object' || ownDemoNode) return
      if (n.type === 'vue' && n.attrs?.type === 'html') { ownDemoNode = n; return }
      const c = n.content
      if (Array.isArray(c)) c.forEach(walk)
      else if (c && typeof c === 'object') walk(c)
    }
    cur.forEach(walk)
    if (!ownDemoNode) throw new Error(`${chId}: no html demo node found`)
    log(`  · ${chId} keeps its own html demo node (${ownDemoNode.attrs.content.length} chars)`)
  }

  const doc = []

  // chapter intro blockquote (⑪)
  doc.push({
    type: 'blockquote',
    content: [
      p(o.intro),
      ol(...o.points),
    ],
  })

  // Learning Objectives
  doc.push(h2('🎯 Learning Objectives'))
  doc.push(ol(...o.objectives))

  // Glossary
  doc.push(h3('📖 Glossary'))
  doc.push(glossary(o.glossary))

  // ---- Ac1: experience demo + screenshot homework (course 8 native)
  doc.push(h2(`🧪 Activity 1 ${o.ac1.title}`))
  doc.push(bq(o.ac1.summary, o.ac1.steps))
  doc.push(h3(`🎬 Experience ${o.ac1.title.replace(/ Demo$/, '')}`))
  doc.push(p(`🎮 Open the ${o.demoName} demo below, then run it.`))
  if (ownDemoNode) {
    doc.push(ownDemoNode)
  } else {
    doc.push(iframe(o.demo.src, o.demo.height))
  }
  doc.push(h3('📤 Submit your homework'))
  doc.push(p(`🤖 Use the ${o.demoName} demo, then submit your work below.`))
  doc.push(vue('homework', own[key].hw))

  // ---- Ac2: questions + discussion (course 8 native)
  doc.push(h2(`🧪 Activity 2 ${o.ac2.title}`))
  doc.push(bq(o.ac2.summary, o.ac2.steps))
  doc.push(h3('🧩 Questions on the Robot Basics'))
  for (const q of own[key].q) doc.push(vue('question', q))
  doc.push(h3('💬 Share your idea'))
  doc.push(vue('comment', own[key].c))

  // ---- Ac3 onward: copied from the template
  const tail = tailFrom(src, srcId, 3)

  // 201: the first copied homework node is template cid 5 (AI for Excel), which
  // shared a name with cid 2 and was merged during cloning → give it its own row.
  if (Number(chId) === 201) {
    let seenHw = 0
    for (const n of tail) {
      if (n.type === 'vue' && n.attrs?.type === 'homework') {
        seenHw++
        if (seenHw === 1) n.attrs.content = String(EXCEL_HW_CID)
      }
    }
    log(`  · 201: first copied homework → cid ${EXCEL_HW_CID} (AI for Excel)`)
  }

  doc.push(...tail)

  // Renumber Activity headings so the whole chapter reads 1..N in order.
  // Ac1/Ac2 were authored as "Activity 1/2"; the copied tail keeps the
  // template's own numbers, so walk everything and number sequentially.
  let actNo = 0
  for (const n of doc) {
    if (n.type === 'heading' && n.attrs.level === 2) {
      const cur = (n.content || []).map((x) => x.text || '').join('')
      if (/^🧪 Activity \d/.test(cur)) {
        actNo++
        const isLast = cur.includes('(Extra)')
        const rest = cur.replace(/^🧪 Activity \d+\s*/, '').replace('(Extra) ', '').trim()
        n.content = [bold(`🧪 Activity ${actNo}${isLast ? ' (Extra)' : ''} ${rest}`)]
      }
    }
  }
  // fix data-toc-id = id
  for (const n of doc) if (n.type === 'heading') n.attrs['data-toc-id'] = n.attrs.id

  results.push({ chId, srcId, doc })
  log(`built ${chId} (from ${srcId}): ${doc.length} nodes`)
}

writeFileSync('/tmp/c8/built.json', JSON.stringify(results, null, 1))
log('\nwrote /tmp/c8/built.json')
