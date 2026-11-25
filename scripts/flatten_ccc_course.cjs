/**
 * CCC 课程目录扁平化：5 分组 + 17 子章 → 15 个顶级章节（两级结构）
 *
 * 合并：
 *   - About the CCC (14)  ← Training Roadmap (567)
 *   - The S1–S5 Route (583) ← Greedy · Tandem Bicycle (584) → 改名 "The Senior Route"
 *   - 17 Years of Real Problems (586) ← 14-Day Training Plan (587) → 改名 "Real Problems & Training Plan"
 * 删除：分组章 566/568/574/582/585 + 被合并章 567/584/587，共 8 章
 * 删除题：GQ1-5（分组概述题，cid 1/4/11/22/24）
 * 重写 orders：15 章全部顶级，parentId=null
 */
const fs = require('fs')
const path = require('path')
const { getOjBase } = require('./lib/oj-config.cjs')

const BASE = 'https://aics.oldmoon.cn'
// OJ 平台基址取自 BASE 所在站点的系统设置（oj.url），不硬编码；启动时解析
let OJ_BASE = ''
const COURSE_ID = 7
const OUT_DIR = path.join(__dirname, '..', 'storage', 'oj_problems')
const CHECKPOINT = path.join(OUT_DIR, 'qcids.json')
const MD_FILE = path.join(__dirname, 'ccc_tutorial_multi.md')

let TOKEN = ''
async function api(p, method = 'GET', body) {
  const res = await fetch(BASE + p, {
    method,
    headers: { 'Content-Type': 'application/json', Cookie: `auth_token=${TOKEN}` },
    body: body === undefined ? undefined : JSON.stringify(body),
  })
  const data = await res.json()
  if (!data.success) throw new Error(`${method} ${p}: ${data.msg || res.status}`)
  return data.data
}

function buildIndexTable() {
  const details = JSON.parse(fs.readFileSync(path.join(OUT_DIR, 'details.json'), 'utf8'))
  const byYear = {}
  for (const d of details) {
    const y = d.pid.match(/CCC(\d+)/)[1]
    const lvl = d.pid.includes('J') ? 'J' : 'S'
    byYear[y] = byYear[y] || { J: [], S: [] }
    byYear[y][lvl].push(d.pid)
  }
  const years = Object.keys(byYear).sort((a, b) => Number(a) - Number(b))
  const link = (pid) => `[${pid}](${OJ_BASE}/p/${pid})`
  let md = '| Year | 🥉 Junior J1–J5 | 🥇 Senior S1–S5 |\n| --- | --- | --- |\n'
  for (const y of years) {
    md += `| 20${y} | ${byYear[y].J.map(link).join(' ')} | ${byYear[y].S.map(link).join(' ')} |\n`
  }
  return md
}

/** 解析 multi md → { key: markdown } */
function parseSections() {
  const raw = fs.readFileSync(MD_FILE, 'utf8')
  const sections = {}
  let cur = null
  for (const line of raw.split('\n')) {
    const m = line.match(/^%%%%%\s*(\S+)/)
    if (m) { cur = m[1]; sections[cur] = []; continue }
    if (cur) sections[cur].push(line)
  }
  for (const k of Object.keys(sections)) sections[k] = sections[k].join('\n').trim()
  return sections
}

/** 保存章节：markdown → 取回 → 标记替换 → 自检 → 回存 */
async function fillChapter(id, name, md, qmap, expectedQ) {
  md = md.replace(/%%INDEX_TABLE%%/g, buildIndexTable())
  await api('/api/chapters/update', 'POST', { id, name, content: md })
  if (!expectedQ.length) { console.log(`✓ 章节 ${id} ${name}（无题）`); return }
  const chRaw = await api(`/api/chapters/show?id=${id}`)
  const doc = (chRaw.chapter || chRaw).content
  let replaced = 0
  const walk = (nodes) => {
    for (let i = 0; i < nodes.length; i++) {
      const n = nodes[i]
      if (n.type === 'paragraph') {
        const text = (n.content || []).map((x) => x.text || '').join('').trim()
        const m = text.match(/^%%([A-Z0-9]+)%%$/)
        if (m && qmap[m[1]]) {
          nodes[i] = { type: 'vue', attrs: { type: 'question', content: String(qmap[m[1]]) } }
          replaced++
          continue
        }
      }
      if (Array.isArray(n.content)) walk(n.content)
    }
  }
  walk(doc.content)
  if (replaced !== expectedQ.length) throw new Error(`章节 ${id} 标记替换 ${replaced}/${expectedQ.length} 不符`)
  await api('/api/chapters/update', 'POST', { id, content: doc })
  console.log(`✓ 章节 ${id} ${name}（${replaced} 题）`)
}

;(async () => {
  OJ_BASE = await getOjBase({ site: BASE })
  console.log(`OJ base: ${OJ_BASE}`)

  const loginRes = await fetch(BASE + '/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: 'admin', password: process.env.LMS_PASS }),
  }).then((r) => r.json())
  if (!loginRes.success) throw new Error('登录失败: ' + loginRes.msg)
  TOKEN = loginRes.data.token || loginRes.data.auth_token
  console.log('登录 OK')

  const qmap = JSON.parse(fs.readFileSync(CHECKPOINT, 'utf8'))
  const sections = parseSections()

  // 1. 删除分组概述题
  const gqCids = ['GQ1', 'GQ2', 'GQ3', 'GQ4', 'GQ5'].map((k) => qmap[k]).filter(Boolean)
  if (gqCids.length) {
    await api('/api/questions/batch', 'POST', {
      rows: gqCids.map((cid) => ({ courseId: COURSE_ID, cid })), action: 'remove',
    })
    for (const k of ['GQ1', 'GQ2', 'GQ3', 'GQ4', 'GQ5']) delete qmap[k]
    fs.writeFileSync(CHECKPOINT, JSON.stringify(qmap, null, 2))
    console.log(`分组概述题已删除: cid ${gqCids.join(',')}`)
  }

  // 2. 删除分组章 + 被合并章
  const toDelete = [566, 567, 568, 574, 582, 584, 585, 587]
  await api('/api/chapters/batch', 'POST', { ids: toDelete, action: 'remove' })
  console.log(`已删除章节: ${toDelete.join(',')}`)

  // 3. 扁平 orders（15 章全顶级）
  const flat = [
    { id: 14, name: 'About the CCC' },
    { id: 569, name: 'Input and Output' },
    { id: 570, name: 'Conditionals' },
    { id: 571, name: 'Loops' },
    { id: 572, name: 'Strings' },
    { id: 573, name: 'Lists and Sorting' },
    { id: 575, name: 'Direct Calculation (J1–J2)' },
    { id: 576, name: 'String Processing' },
    { id: 577, name: 'Enumeration and Simulation' },
    { id: 578, name: 'Timeline Simulation' },
    { id: 579, name: '2D Grids' },
    { id: 580, name: 'Search (BFS / DFS)' },
    { id: 581, name: 'Recursion and Backtracking' },
    { id: 583, name: 'The Senior Route' },
    { id: 586, name: 'Real Problems & Training Plan' },
  ]
  await api('/api/courses/update', 'POST', {
    id: COURSE_ID,
    orders: flat.map((c, i) => ({ id: String(c.id), label: c.name, parentId: null, order: i })),
  })
  console.log('扁平 orders 已写入（15 章顶级）')

  // 4. 三个合并章重新填充
  await fillChapter(14, 'About the CCC',
    ['## 🍁 About the CCC', '', sections.C11, '', '## 🧭 Training Roadmap', '', sections.C12].join('\n'),
    qmap, ['Q1', 'Q2'])

  await fillChapter(583, 'The Senior Route',
    ['## 🗺️ The S1–S5 Route', '', sections.C41, '', '## ⚖️ Greedy in Action: Tandem Bicycle', '', sections.C42].join('\n'),
    qmap, ['Q18', 'O7'])

  await fillChapter(586, 'Real Problems & Training Plan',
    ['## 📚 17 Years of Real Problems (2010–2026)', '', sections.C51, '', '## ✅ 14-Day Training Plan', '', sections.C52].join('\n'),
    qmap, [])

  // 5. 验证
  const course = await api(`/api/courses/show?id=${COURSE_ID}`)
  console.log(`\n最终结构：${course.chapters.length} 章 / orders ${course.orders.length} 条`)
  for (const o of course.orders) console.log(`${String(o.order).padStart(2)}. ${o.label} (id=${o.id})`)
  console.log(`预览: ${BASE}/course/${COURSE_ID}/14`)
})().catch((e) => {
  console.error('❌ 失败:', e.message)
  process.exit(1)
})
