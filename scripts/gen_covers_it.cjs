/**
 * it.oldmoon.cn 实例：为全部 18 门课程生成封面（SVG→PNG→上传→config.coverImg）
 * 模板沿用 scripts/gen_covers.cjs；用法：
 * NODE_PATH=/Users/oldmoon/.workbuddy/binaries/node/workspace/node_modules \
 *   /Users/oldmoon/.workbuddy/binaries/node/versions/22.22.2/bin/node scripts/gen_covers_it.cjs
 */
const fs = require('fs')
const path = require('path')
const { chromium } = require('playwright')

const BASE = 'https://it.oldmoon.cn'
const OUT_DIR = path.join(__dirname, 'covers_it')
const W = 1600, H = 900

const IT_COURSES = [
  { id: 1,  cat: '国家课程', title: '课程标准',            sub: '义务教育信息科技课程标准 · 2022 年版全文', emoji: '📜', c1: '#1e293b', c2: '#64748b' },
  { id: 2,  cat: '一年级 · 上', title: '信息交流与分享',   sub: '义务教育信息科技教学指南 · 一年级上册',      emoji: '🌱', c1: '#155e75', c2: '#22d3ee' },
  { id: 3,  cat: '一年级 · 下', title: '信息交流与分享',   sub: '义务教育信息科技教学指南 · 一年级下册',      emoji: '🌿', c1: '#0f766e', c2: '#2dd4bf' },
  { id: 4,  cat: '二年级 · 上', title: '信息隐私与安全',   sub: '义务教育信息科技教学指南 · 二年级上册',      emoji: '🛡️', c1: '#14532d', c2: '#22c55e' },
  { id: 5,  cat: '二年级 · 下', title: '信息隐私与安全',   sub: '义务教育信息科技教学指南 · 二年级下册',      emoji: '🔒', c1: '#166534', c2: '#4ade80' },
  { id: 6,  cat: '三年级 · 上', title: '在线学习与生活',   sub: '义务教育信息科技教学指南 · 三年级上册',      emoji: '🌐', c1: '#1e3a8a', c2: '#3b82f6' },
  { id: 7,  cat: '三年级 · 下', title: '在线学习与生活',   sub: '义务教育信息科技教学指南 · 三年级下册',      emoji: '💬', c1: '#1d4ed8', c2: '#60a5fa' },
  { id: 8,  cat: '四年级 · 上', title: '数据与编码',       sub: '义务教育信息科技教学指南 · 四年级上册',      emoji: '🔢', c1: '#7c2d12', c2: '#f97316' },
  { id: 9,  cat: '四年级 · 下', title: '数据与编码',       sub: '义务教育信息科技教学指南 · 四年级下册',      emoji: '📊', c1: '#9a3412', c2: '#fb923c' },
  { id: 10, cat: '五年级 · 上', title: '身边的算法',        sub: '义务教育信息科技教学指南 · 五年级上册',      emoji: '🧮', c1: '#312e81', c2: '#6366f1' },
  { id: 11, cat: '五年级 · 下', title: '身边的算法',        sub: '义务教育信息科技教学指南 · 五年级下册',      emoji: '⚡', c1: '#3730a3', c2: '#818cf8' },
  { id: 12, cat: '六年级 · 上', title: '过程与控制',        sub: '义务教育信息科技教学指南 · 六年级上册',      emoji: '🎛️', c1: '#701a75', c2: '#d946ef' },
  { id: 13, cat: '六年级 · 下', title: '过程与控制',        sub: '义务教育信息科技教学指南 · 六年级下册',      emoji: '🚦', c1: '#86198f', c2: '#e879f9' },
  { id: 14, cat: '七年级 · 上', title: '互联网应用与创新',  sub: '义务教育信息科技教学指南 · 七年级上册',      emoji: '🌍', c1: '#164e63', c2: '#0ea5e9' },
  { id: 15, cat: '七年级 · 下', title: '互联网应用与创新',  sub: '义务教育信息科技教学指南 · 七年级下册',      emoji: '🕸️', c1: '#0c4a6e', c2: '#38bdf8' },
  { id: 16, cat: '八年级 · 上', title: '物联网实践与探索',  sub: '义务教育信息科技教学指南 · 八年级上册',      emoji: '📡', c1: '#134e4a', c2: '#14b8a6' },
  { id: 17, cat: '八年级 · 下', title: '物联网实践与探索',  sub: '义务教育信息科技教学指南 · 八年级下册',      emoji: '🔐', c1: '#115e59', c2: '#2dd4bf' },
  { id: 18, cat: '人工智能专册', title: '人工智能与智慧社会', sub: '义务教育信息科技教学指南 · 人工智能专册',   emoji: '🤖', c1: '#312e81', c2: '#8b5cf6' },
  { id: 19,  cat: 'AI 通识教育',  title: '中小学人工智能通识教育指南', sub: '教育部 · 2025 年版 · 分层递进的通识教育体系', emoji: '🧠', c1: '#422006', c2: '#d97706' },
  { id: 20, cat: 'AI 通识 · 一年级', title: 'AI 在我身边',        sub: 'AI 通识教育 · 一年级 · 8 课时',        emoji: '🧭', c1: '#7f1d1d', c2: '#ef4444' },
  { id: 21, cat: 'AI 通识 · 二年级', title: 'AI 与我的生活',      sub: 'AI 通识教育 · 二年级 · 8 课时',        emoji: '🔍', c1: '#9a3412', c2: '#fb923c' },
  { id: 22, cat: 'AI 通识 · 三年级', title: 'AI 是怎样工作的',    sub: 'AI 通识教育 · 三年级 · 8 课时',        emoji: '🔬', c1: '#92400e', c2: '#f59e0b' },
  { id: 23, cat: 'AI 通识 · 四年级', title: 'AI 怎么学习与推理',  sub: 'AI 通识教育 · 四年级 · 8 课时',        emoji: '🧪', c1: '#14532d', c2: '#22c55e' },
  { id: 24, cat: 'AI 通识 · 五年级', title: '生成式 AI 初体验',    sub: 'AI 通识教育 · 五年级 · 8 课时',        emoji: '🎨', c1: '#134e4a', c2: '#2dd4bf' },
  { id: 25, cat: 'AI 通识 · 六年级', title: 'AI 与人类社会',      sub: 'AI 通识教育 · 六年级 · 8 课时',        emoji: '🌆', c1: '#155e75', c2: '#22d3ee' },
  { id: 26, cat: 'AI 通识 · 七年级', title: '机器学习基础',        sub: 'AI 通识教育 · 七年级 · 8 课时',        emoji: '🧠', c1: '#1e3a8a', c2: '#3b82f6' },
  { id: 27, cat: 'AI 通识 · 八年级', title: '生成式 AI 与智能体',  sub: 'AI 通识教育 · 八年级 · 8 课时',        emoji: '🤖', c1: '#312e81', c2: '#6366f1' },
  { id: 28, cat: 'AI 通识 · 九年级', title: 'AI 与社会',          sub: 'AI 通识教育 · 九年级 · 毕业综合项目 · 8 课时', emoji: '🎓', c1: '#4c1d95', c2: '#8b5cf6' },
]

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
    <text x="96" y="846" font-size="26" font-weight="600" fill="rgba(255,255,255,0.45)" letter-spacing="6">义务教育信息科技 · 国家课程</text>
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
  const loginRes = await fetch(BASE + '/api/auth/login', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: 'admin', password: 'REDACTED' }),
  }).then((r) => r.json())
  if (!loginRes.success) throw new Error('登录失败: ' + loginRes.msg)
  TOKEN = loginRes.data.token || loginRes.data.auth_token
  console.log('登录 OK')

  fs.mkdirSync(OUT_DIR, { recursive: true })

  const browser = await chromium.launch({ channel: 'chrome' })
  const page = await browser.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: 1 })
  const pngPaths = {}
  for (const c of (process.env.ONLY ? IT_COURSES.filter(x => process.env.ONLY.split(',').includes(String(x.id))) : IT_COURSES)) {
    const svgPath = path.join(OUT_DIR, `course-${c.id}.svg`)
    const pngPath = path.join(OUT_DIR, `course-${c.id}.png`)
    fs.writeFileSync(svgPath, coverSvg(c))
    await page.goto('file://' + svgPath)
    await page.screenshot({ path: pngPath, clip: { x: 0, y: 0, width: W, height: H } })
    pngPaths[c.id] = pngPath
    console.log(`✓ SVG→PNG course-${c.id} (${c.title})`)
  }
  await browser.close()

  for (const c of (process.env.ONLY ? IT_COURSES.filter(x => process.env.ONLY.split(',').includes(String(x.id))) : IT_COURSES)) {
    const buf = fs.readFileSync(pngPaths[c.id])
    const form = new FormData()
    form.append('files', new Blob([buf], { type: 'image/png' }), `course-${c.id}.png`)
    form.append('group', `course-${c.id}`)
    const up = await api('/api/files/upload', 'POST', form, true)
    const detail = await api(`/api/courses/show?id=${c.id}`)
    const cfg = { ...(detail.config || {}), coverImg: up.url }
    await api('/api/courses/update', 'POST', { id: c.id, config: cfg })
    console.log(`✅ coverImg 已设置 course-${c.id} (${c.title}): ${up.url}`)
  }

  console.log('\n🎉 全部封面完成')
})().catch((e) => { console.error('❌ 失败:', e.message); process.exit(1) })
