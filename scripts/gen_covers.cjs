/**
 * 为所有缺封面的课程生成 SVG 封面 → Playwright(系统 Chrome) 渲染 PNG → 上传 → courses/update 设置 coverImg
 * 模板：1600×900，渐变背景 + 网格 + 电路装饰 + 类别徽章 + 大标题 + emoji 图标块
 * 幂等：封面上传靠 sha256 去重；coverImg 重复设置无害
 *
 * 用法：NODE_PATH=<node_modules> node scripts/gen_covers.cjs
 */
const fs = require('fs')
const path = require('path')
const { chromium } = require('playwright')

const BASE = process.env.COVER_BASE || 'https://aics.oldmoon.cn'
const COVER_USER = process.env.COVER_USER || 'admin'
const COVER_PASS = process.env.COVER_PASS
const INSTANCE = process.env.COVER_INSTANCE || 'aics'
const OUT_DIR = path.join(__dirname, 'covers')
const W = 1600, H = 900

const AICS_COURSES = [
  { id: 19, cat: 'IB',      title: 'Computer Science', sub: 'Theme A & B · SL / HL',          emoji: '🧠', c1: '#312e81', c2: '#7c3aed' },
  { id: 1,  cat: 'IGCSE',   title: 'CS · 0478',        sub: 'Cambridge IGCSE Computer Science', emoji: '📘', c1: '#075985', c2: '#0ea5e9' },
  { id: 2,  cat: 'A-Level', title: 'CS · 9618',        sub: 'Cambridge International A Level',  emoji: '🎓', c1: '#92400e', c2: '#f59e0b' },
  { id: 3,  cat: 'AP',      title: 'Computer Science A', sub: 'Java · AP CSA',                 emoji: '☕', c1: '#064e3b', c2: '#10b981' },
  { id: 4,  cat: 'AP',      title: 'CS Principles',    sub: 'AP Computer Science Principles',   emoji: '🧩', c1: '#881337', c2: '#f43f5e' },
  { id: 5,  cat: 'DSE',     title: 'ICT',              sub: '資訊及通訊科技',                    emoji: '💻', c1: '#164e63', c2: '#06b6d4' },
  { id: 6,  cat: '竞赛',    title: 'ACSL',             sub: 'American Computer Science League', emoji: '🧮', c1: '#14532d', c2: '#22c55e' },
  { id: 7,  cat: '竞赛',    title: 'CCC',              sub: 'Canadian Computing Competition',   emoji: '🍁', c1: '#7f1d1d', c2: '#ef4444' },
  { id: 8,  cat: '竞赛',    title: 'USACO',            sub: 'USA Computing Olympiad',           emoji: '🏅', c1: '#4c1d95', c2: '#8b5cf6' },
  { id: 9,  cat: '竞赛',    title: 'NOAI',             sub: '全国人工智能奥林匹克 · 备考',        emoji: '🤖', c1: '#701a75', c2: '#d946ef' },
  { id: 14, cat: 'AI',      title: 'Web 开发',          sub: 'Nuxt 全栈 × AI Agent',            emoji: '🌐', c1: '#1e3a8a', c2: '#3b82f6' },
  { id: 15, cat: 'AI',      title: 'Game',             sub: '游戏开发实战',                      emoji: '🎮', c1: '#581c87', c2: '#a855f7' },
  { id: 16, cat: 'AI',      title: 'APP',              sub: '移动应用开发',                      emoji: '📱', c1: '#831843', c2: '#ec4899' },
  { id: 20, cat: 'AI',      title: 'Agent',            sub: 'AI Agent 实战工作流',               emoji: '🧑‍💻', c1: '#0f172a', c2: '#475569' },
  { id: 17, cat: '编程语言', title: 'Python',           sub: '从零开始的编程之旅 · 语法到实战',      emoji: '🐍', c1: '#1e4258', c2: '#3776ab' },
  { id: 18, cat: '编程语言', title: 'C++',               sub: '竞赛与系统编程的基石',                emoji: '⚙️', c1: '#12355b', c2: '#659ad2' },
  { id: 22, cat: 'AI',      title: '小程序',          sub: 'uni-app X × 微信小程序 × AI Agent', emoji: '💬', c1: '#14532d', c2: '#22c55e' },
  { id: 21, cat: '竞赛',    title: 'NOI',              sub: '全国青少年信息学奥林匹克',            emoji: '🏆', c1: '#172554', c2: '#1d4ed8' },
]

/* 10.28.1.151 实例（ID 含义与外网不同） */
const N151_COURSES = [
  { id: 3,  cat: 'G8',        title: 'Speech Tech',       sub: 'STEAM · Intelligent Speech Technology', emoji: '🎙️', c1: '#164e63', c2: '#06b6d4' },
  { id: 41, cat: 'Notice',    title: 'Notice',            sub: 'Announcements & Notice Board',          emoji: '📢', c1: '#1f2937', c2: '#6b7280' },
  { id: 17, cat: 'Competition', title: 'FRC',             sub: 'FIRST Robotics Competition',            emoji: '🏁', c1: '#7c2d12', c2: '#f97316' },
  { id: 13, cat: 'Competition', title: 'NOAI',            sub: '全国人工智能奥林匹克',                    emoji: '🤖', c1: '#701a75', c2: '#d946ef' },
  { id: 14, cat: 'Competition', title: 'NOI',             sub: '全国青少年信息学奥林匹克',                emoji: '🏆', c1: '#172554', c2: '#1d4ed8' },
  { id: 37, cat: 'Competition', title: 'CAICP',           sub: '青少年编程能力等级考试',                  emoji: '🏅', c1: '#3b0764', c2: '#8b5cf6' },
  { id: 38, cat: 'Competition', title: 'VEX',             sub: 'VEX Robotics Competition',              emoji: '⚙️', c1: '#713f12', c2: '#eab308' },
  { id: 30, cat: 'G10-G12',   title: 'Machine Learning',  sub: '机器学习 · 从数据到模型',                 emoji: '🧠', c1: '#312e81', c2: '#6366f1' },
  { id: 31, cat: 'G10-G12',   title: 'Deep Learning',     sub: '深度学习 · 神经网络与实战',               emoji: '🌌', c1: '#4a044e', c2: '#a855f7' },
  { id: 32, cat: 'G10-G12',   title: 'NLP',               sub: 'Natural Language Processing',          emoji: '🗣️', c1: '#0c4a6e', c2: '#38bdf8' },
  { id: 33, cat: 'G10-G12',   title: 'Computer Vision',   sub: '计算机视觉 · 看见世界',                  emoji: '👁️', c1: '#134e4a', c2: '#14b8a6' },
  { id: 34, cat: 'G10-G12',   title: 'LLM',               sub: 'Large Language Models · 大语言模型',     emoji: '🦙', c1: '#14532d', c2: '#4ade80' },
  { id: 35, cat: 'G10-G12',   title: 'Speech',            sub: 'Speech Processing · 语音处理',           emoji: '🔊', c1: '#78350f', c2: '#f59e0b' },
  { id: 25, cat: 'G10-G12',   title: 'DSA',               sub: 'Data Structures & Algorithms · 数据结构与算法', emoji: '🧱', c1: '#422006', c2: '#d97706' },
  { id: 36, cat: 'G10-G12',   title: 'Robotics',          sub: 'Robotics · 机器人学',                    emoji: '🦾', c1: '#7f1d1d', c2: '#ef4444' },
  { id: 26, cat: 'G10-G12',   title: 'Operating Systems', sub: '操作系统 · 进程与资源管理',               emoji: '🖥️', c1: '#1f2937', c2: '#64748b' },
  { id: 27, cat: 'G10-G12',   title: 'COA',               sub: 'Computer Organization & Architecture',  emoji: '🔩', c1: '#334155', c2: '#94a3b8' },
  { id: 28, cat: 'G10-G12',   title: 'Database',          sub: 'Database Systems · 数据库系统',          emoji: '🗄️', c1: '#1e1b4b', c2: '#818cf8' },
  { id: 29, cat: 'G10-G12',   title: 'Networks',          sub: 'Computer Networks · 计算机网络',         emoji: '🌐', c1: '#0c4a6e', c2: '#2563eb' },
  { id: 23, cat: 'G10-G12',   title: 'Linear Algebra',    sub: '线性代数 · 矩阵与向量空间',               emoji: '➗', c1: '#881337', c2: '#fb7185' },
  { id: 21, cat: 'G10-G12',   title: 'Prob & Stats',      sub: 'Probability and Statistics · 概率统计',  emoji: '📊', c1: '#831843', c2: '#f472b6' },
  { id: 24, cat: 'G10-G12',   title: 'Discrete Math',     sub: 'Discrete Mathematics · 离散数学',        emoji: '🎲', c1: '#134e4a', c2: '#2dd4bf' },
  { id: 39, cat: 'Library',   title: 'Drone',             sub: '无人机 · 编程与飞行',                    emoji: '🛸', c1: '#0c4a6e', c2: '#22d3ee' },
]

const COURSES = INSTANCE === 'n151' ? N151_COURSES : AICS_COURSES

function coverSvg(c) {
  const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  const pillW = 60 + [...c.cat].reduce((w, ch) => w + (ch.charCodeAt(0) > 255 ? 34 : 22), 0)
  const titleSize = c.title.length > 14 ? 84 : c.title.length > 9 ? 96 : 112
  const grid = []
  for (let x = 80; x < W; x += 80) grid.push(`<line x1="${x}" y1="0" x2="${x}" y2="${H}" stroke="rgba(255,255,255,0.035)" stroke-width="1"/>`)
  for (let y = 80; y < H; y += 80) grid.push(`<line x1="0" y1="${y}" x2="${W}" y2="${y}" stroke="rgba(255,255,255,0.035)" stroke-width="1"/>`)
  const circuit = `
    <g stroke="rgba(255,255,255,0.22)" stroke-width="3" fill="none">
      <polyline points="80,140 300,140 340,180 560,180"/>
      <polyline points="80,190 240,190 280,230 460,230"/>
      <polyline points="1420,820 1240,820 1200,780 1020,780"/>
    </g>
    <g fill="rgba(255,255,255,0.45)">
      <circle cx="80" cy="140" r="7"/><circle cx="560" cy="180" r="7"/>
      <circle cx="80" cy="190" r="7"/><circle cx="460" cy="230" r="7"/>
      <circle cx="1420" cy="820" r="7"/><circle cx="1020" cy="780" r="7"/>
    </g>`
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="${c.c1}"/><stop offset="1" stop-color="${c.c2}"/>
    </linearGradient>
    <radialGradient id="glow1" cx="0.82" cy="0.28" r="0.5">
      <stop offset="0" stop-color="rgba(255,255,255,0.16)"/><stop offset="1" stop-color="rgba(255,255,255,0)"/>
    </radialGradient>
    <radialGradient id="glow2" cx="0.1" cy="0.95" r="0.55">
      <stop offset="0" stop-color="rgba(255,255,255,0.10)"/><stop offset="1" stop-color="rgba(255,255,255,0)"/>
    </radialGradient>
  </defs>
  <rect width="${W}" height="${H}" fill="url(#bg)"/>
  ${grid.join('')}
  <rect width="${W}" height="${H}" fill="url(#glow1)"/>
  <rect width="${W}" height="${H}" fill="url(#glow2)"/>
  <rect x="-160" y="480" width="2200" height="130" fill="rgba(255,255,255,0.05)" transform="rotate(-8 800 450)"/>
  ${circuit}
  <g font-family="'PingFang SC','Helvetica Neue',Arial,sans-serif">
    <text x="1180" y="250" font-size="120" font-weight="700" fill="rgba(255,255,255,0.10)" font-family="Menlo,monospace">{ }</text>
    <rect x="1130" y="280" width="360" height="360" rx="92" fill="rgba(255,255,255,0.14)" stroke="rgba(255,255,255,0.30)" stroke-width="3"/>
    <text x="1310" y="545" font-size="185" text-anchor="middle">${c.emoji}</text>
    <rect x="96" y="470" width="${pillW}" height="66" rx="33" fill="rgba(255,255,255,0.13)" stroke="rgba(255,255,255,0.35)" stroke-width="2"/>
    <text x="${96 + pillW / 2}" y="514" font-size="32" font-weight="600" fill="rgba(255,255,255,0.9)" text-anchor="middle" letter-spacing="4">${esc(c.cat)}</text>
    <text x="96" y="672" font-size="${titleSize}" font-weight="800" fill="#ffffff" letter-spacing="1">${esc(c.title)}</text>
    <text x="100" y="752" font-size="42" fill="rgba(255,255,255,0.75)" letter-spacing="2">${esc(c.sub)}</text>
    <text x="96" y="846" font-size="26" font-weight="600" fill="rgba(255,255,255,0.45)" letter-spacing="6">AICS ACADEMY</text>
  </g>
</svg>`
}

let TOKEN = ''
async function api(p, method = 'GET', body, isForm = false) {
  const headers = { Cookie: `auth_token=${TOKEN}` }
  if (!isForm) headers['Content-Type'] = 'application/json'
  const res = await fetch(BASE + p, {
    method, headers,
    body: body === undefined ? undefined : (isForm ? body : JSON.stringify(body)),
  })
  const data = await res.json()
  if (!data.success) throw new Error(`${method} ${p}: ${data.msg || data.message || res.status}`)
  return data.data
}

;(async () => {
  // 登录
  const loginRes = await fetch(BASE + '/api/auth/login', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: COVER_USER, password: COVER_PASS }),
  }).then((r) => r.json())
  if (!loginRes.success) throw new Error('登录失败: ' + loginRes.msg)
  TOKEN = loginRes.data.token || loginRes.data.auth_token
  console.log('登录 OK')

  fs.mkdirSync(OUT_DIR, { recursive: true })

  // 生成 SVG + 渲染 PNG
  const browser = await chromium.launch({ channel: 'chrome' })
  const page = await browser.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: 1 })
  const pngPaths = {}
  for (const c of COURSES) {
    const svgPath = path.join(OUT_DIR, `course-${c.id}.svg`)
    const pngPath = path.join(OUT_DIR, `course-${c.id}.png`)
    fs.writeFileSync(svgPath, coverSvg(c))
    await page.goto('file://' + svgPath)
    await page.screenshot({ path: pngPath, clip: { x: 0, y: 0, width: W, height: H } })
    pngPaths[c.id] = pngPath
    console.log(`✓ SVG→PNG course-${c.id} (${c.title})`)
  }
  await browser.close()

  // 上传 + 设置 coverImg
  for (const c of COURSES) {
    const buf = fs.readFileSync(pngPaths[c.id])
    const form = new FormData()
    form.append('files', new Blob([buf], { type: 'image/png' }), `course-${c.id}.png`)
    form.append('group', `course-${c.id}`)
    const up = await api('/api/files/upload', 'POST', form, true)
    console.log(`⬆ 上传 OK course-${c.id}: ${up.url}`)
    // coverImg 存于 courses.config.coverImg —— 合并现有 config，避免覆盖 icon/lmsConfig 等
    const detail = await api(`/api/courses/show?id=${c.id}`)
    const cfg = { ...(detail.config || {}), coverImg: up.url }
    await api('/api/courses/update', 'POST', { id: c.id, config: cfg })
    console.log(`✅ coverImg 已设置 course-${c.id} (${c.title})`)
  }

  console.log('\n🎉 全部封面完成')
})().catch((e) => { console.error('❌ 失败:', e.message); process.exit(1) })
