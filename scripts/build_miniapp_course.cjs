/**
 * 构建 微信小程序开发教程课程（course 22）写入 aics.oldmoon.cn
 *
 * 主题：uni-app X + AI Agent 的微信小程序开发（uvue/UTS/页面导航/微信开放能力/实战打卡/提审发布），中文
 * 结构：6 个分组（group）+ 20 个子章节，每章 2 道配套练习
 * 流程（复用模板，含 currentGroup 修复）：
 *  1. 登录 → 2. 幂等建题（checkpoint: storage/oj_problems/miniminiapp_qcids.json）
 *  3. 解析 scripts/miniminiapp_tutorial.md（%%%%% 分节），创建缺失章节（复用 id 798 作 "微信小程序全景"）
 *  4. orders 目录树 + 课程简介 → 5. 逐章 markdown → 替换标记 → 自检 → 回存
 *
 * 用法：node scripts/build_miniapp_course.cjs
 */
const fs = require('fs')
const path = require('path')

const BASE = 'https://aics.oldmoon.cn'
const COURSE_ID = 22
const REUSE = { X1: 798 } // "微信小程序全景" 复用已有章节 798
const OUT_DIR = path.join(__dirname, '..', 'storage', 'oj_problems')
const CHECKPOINT = path.join(OUT_DIR, 'miniapp_qcids.json')
const MD_FILE = path.join(__dirname, 'miniapp_tutorial.md')

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

/* ---------- tiptap 构建工具 ---------- */
const t = (text, marks) => ({ type: 'text', text, ...(marks ? { marks } : {}) })
const code = (text) => t(text, [{ type: 'code' }])
const p = (...children) => ({ type: 'paragraph', content: children.map((c) => (typeof c === 'string' ? t(c) : c)) })
const docOf = (...blocks) => ({ type: 'doc', content: blocks })
const inputNode = (ans) => ({ type: 'inputs', attrs: { content: ans } })
const selectNode = (ans) => ({ type: 'select', attrs: { content: ans } })

function validateContent(node, issues = []) {
  if (!node || typeof node !== 'object') return issues
  if (node.type === 'text') {
    if (typeof node.text !== 'string') issues.push('text.text is not a string')
    if (node.marks !== undefined && !Array.isArray(node.marks)) issues.push('marks is not an array')
  }
  if (node.type === 'heading' && !node.attrs?.id) issues.push('heading missing id: ' + (node.content?.[0]?.text || ''))
  if (node.type === 'codeBlock' && !node.attrs?.language) issues.push('codeBlock missing language')
  if (Array.isArray(node.content)) node.content.forEach((n) => validateContent(n, issues))
  else if (node.content && typeof node.content === 'object') validateContent(node.content, issues)
  return issues
}

/* ---------- 题目定义 ---------- */
const JUDGE = ['正确 ✅', '错误 ❌']
const CORRECT = [0]
const WRONG = [1]
const sortAns = (n) => Array.from({ length: n }, (_, i) => i)
const matchAns = (n) => Array.from({ length: n }, (_, i) => i)

const QUESTIONS = [
  { key: 'X1A', type: 'classify',
    content: docOf(p('🐾 把特点匹配给对应形态：')),
    options: [
      { name: '微信小程序', items: ['免安装即点即用', '需通过微信审核上架'] },
      { name: '原生 App', items: ['能力最强', '需要应用商店下载安装'] }],
    answer: [0, 0, 1, 1] },
  { key: 'X1B', type: 'single',
    content: docOf(p('小程序选题的成功心法是？')),
    options: ['面面俱到的大而全', '一个高频小场景（打卡/报名/记账）', '功能越多越好', '照抄一个大平台'], answer: [1] },
  { key: 'X2A', type: 'match',
    content: docOf(p('🦄 把 uni-app X 关键词匹配给含义：')),
    options: [
      { left: 'uvue', right: '页面文件（template+script+style）' },
      { left: 'UTS', right: 'TypeScript 风格的语言' },
      { left: '条件编译', right: '为不同平台写不同逻辑' }],
    answer: matchAns(3) },
  { key: 'X2B', type: 'judge',
    content: docOf(p('用 uni-app X 写小程序比原生 WXML 更适合 Agent 辅助——因为 Vue 语法是 Agent 的强项。')),
    options: JUDGE, answer: CORRECT },
  { key: 'X3A', type: 'classify',
    content: docOf(p('🛠️ 把职责分给两个工具：')),
    options: [
      { name: 'HBuilderX 🟣', items: ['编写 uvue 代码', '编译到小程序端'] },
      { name: '微信开发者工具 💚', items: ['预览调试小程序', '上传代码提审'] }],
    answer: [0, 0, 1, 1] },
  { key: 'X3B', type: 'single',
    content: docOf(p('注册小程序账号后获得的项目身份标识叫？')),
    options: ['AppID', 'UUID', 'API Key', 'UID'], answer: [0] },
  { key: 'U1A', type: 'match',
    content: docOf(p('📄 把小程序标签匹配给网页标签：')),
    options: [
      { left: 'view', right: 'div' },
      { left: 'text', right: 'span' },
      { left: 'image', right: 'img' }],
    answer: matchAns(3) },
  { key: 'U1B', type: 'judge',
    content: docOf(p('小程序里文字可以直接写在 view 标签里，不包 text 也能保证渲染。')),
    options: JUDGE, answer: WRONG,
    explanation: docOf(p('经典坑：文字必须包在 <text> 里。')) },
  { key: 'U2A', type: 'single',
    content: docOf(p('UTS 的变量类型标注写在哪里？')),
    options: ['let number x', 'let x: number', 'x as let number', '不用标类型'], answer: [1] },
  { key: 'U2B', type: 'fill',
    content: docOf(p('UTS 可以理解为"更严格的 ', inputNode('TS'), '"（TypeScript 风格）。')),
    options: [''], answer: ['TS'] },
  { key: 'U3A', type: 'match',
    content: docOf(p('🔄 页面生命周期匹配：')),
    options: [
      { left: 'onLoad', right: '页面加载一次（可拿路由参数）' },
      { left: 'onShow', right: '每次显示都触发（返回也触发）' },
      { left: 'onUnload', right: '页面销毁' }],
    answer: matchAns(3) },
  { key: 'U3B', type: 'single',
    content: docOf(p('"从其他页面返回时刷新打卡列表"的逻辑应放在？')),
    options: ['onLoad', 'onShow', 'onUnload', 'data'], answer: [1] },
  { key: 'U4A', type: 'fill',
    content: docOf(p('小程序自适应单位 rpx：750rpx 等于一屏', inputNode('宽度'), '。')),
    options: [''], answer: ['宽度'] },
  { key: 'U4B', type: 'single',
    content: docOf(p('小程序布局的主力方案是？')),
    options: ['float 浮动', 'flex 弹性布局', 'table 表格', '绝对定位铺满'], answer: [1] },
  { key: 'W1A', type: 'single',
    content: docOf(p('跳转到 tabBar 页面（如底部"统计"页）必须用？')),
    options: ['navigateTo', 'switchTab', 'redirectTo', 'navigateBack'], answer: [1],
    explanation: docOf(p('tabBar 页面专用 switchTab —— navigateTo 对它无效，小程序导航第一坑！')) },
  { key: 'W1B', type: 'fill',
    content: docOf(p('小程序的"页面注册表 + tabBar 配置"都在 ', inputNode('pages.json'), ' 里。')),
    options: [''], answer: ['pages.json'] },
  { key: 'W2A', type: 'match',
    content: docOf(p('💬 交互反馈三件套匹配：')),
    options: [
      { left: 'showToast', right: '轻提示（打卡成功 ✅）' },
      { left: 'showModal', right: '确认对话框（确认删除？）' },
      { left: 'showLoading', right: '加载中遮罩' }],
    answer: matchAns(3) },
  { key: 'W2B', type: 'judge',
    content: docOf(p('每个异步操作配 loading、每个成功失败配 Toast，是小程序体验的底色。')),
    options: JUDGE, answer: CORRECT },
  { key: 'W3A', type: 'single',
    content: docOf(p('识别小程序唯一用户的正规姿势是？')),
    options: ['uni.login 拿 code → 后端换 openid', '问用户要微信号', '记录手机型号', '让用户自己输 ID'], answer: [0] },
  { key: 'W3B', type: 'judge',
    content: docOf(p('页面右上角"…"转发需要页面实现 onShareAppMessage。')),
    options: JUDGE, answer: CORRECT },
  { key: 'S1A', type: 'fill',
    content: docOf(p('同步写本地存储：uni.', inputNode('setStorageSync'), "('records', json)。")),
    options: [''], answer: ['setStorageSync'] },
  { key: 'S1B', type: 'single',
    content: docOf(p('本地存储的局限是？')),
    options: ['只能存 1 条', '约 10MB 上限且清缓存会丢', '不能存字符串', '每次写入要联网'], answer: [1] },
  { key: 'S2A', type: 'single',
    content: docOf(p('"开发者工具正常、真机请求失败"，最可能的原因是？')),
    options: ['手机没电', '域名没加小程序后台白名单', '代码写错语言', '天气不好'], answer: [1] },
  { key: 'S2B', type: 'judge',
    content: docOf(p('正式环境的请求域名必须 https 且在小程序后台配置白名单。')),
    options: JUDGE, answer: CORRECT },
  { key: 'S3A', type: 'classify',
    content: docOf(p('☁️ 把场景匹配给后端方案：')),
    options: [
      { name: '本地存储 📦', items: ['课程项目的打卡记录', '设置项开关'] },
      { name: '云端 ☁️', items: ['多用户共享的数据', '正式上线的产品'] }],
    answer: [0, 0, 1, 1] },
  { key: 'S3B', type: 'judge',
    content: docOf(p('自建后端方案可以直接用 Nuxt 的 server/api 实现小程序调用的接口。')),
    options: JUDGE, answer: CORRECT },
  { key: 'M1A', type: 'multiple',
    content: docOf(p('班级打卡小程序的一页纸规划应包含？')),
    options: ['页面与 tabBar 结构', '数据模型（date/taskId/done）', '素材策略与验收标准', '给 Agent 的任务拆解'], answer: [0, 1, 2, 3] },
  { key: 'M1B', type: 'single',
    content: docOf(p('"打卡 → 杀掉小程序重开 → 记录还在"验证的是？')),
    options: ['网络速度', '数据持久化是否生效', '界面美观度', '审核是否通过'], answer: [1] },
  { key: 'M2A', type: 'sort',
    content: docOf(p('✅ 打卡动作的处理顺序：')),
    options: ['判断今天是否已打过（去重）', '往记录列表插入一条', '写入本地存储', 'Toast 反馈打卡成功'],
    answer: sortAns(4) },
  { key: 'M2B', type: 'fill',
    content: docOf(p('连续天数统计：从今天往前逐日检查记录，断一天就', inputNode('停止'), '计数。')),
    options: [''], answer: ['停止'] },
  { key: 'M3A', type: 'multiple',
    content: docOf(p('统计与打磨阶段可以做哪些？')),
    options: ['连续 7 天成就弹窗 🎉', '首次进入引导空状态', '统一主题绿 #07c160', '随机改变功能'], answer: [0, 1, 2] },
  { key: 'M3B', type: 'judge',
    content: docOf(p('统计页给用户回访理由，是数据可视化性价比最高的打磨方向之一。')),
    options: JUDGE, answer: CORRECT },
  { key: 'M4A', type: 'sort',
    content: docOf(p('📲 小程序发布三级阶梯：')),
    options: ['真机扫码预览', '上传代码设为体验版给体验成员', '提交审核', '审核通过全量发布'],
    answer: sortAns(4) },
  { key: 'M4B', type: 'multiple',
    content: docOf(p('提审前自检清单包括？')),
    options: ['页面无空白无报错', '类目选择正确', '用户隐私已声明', '放一些测试数据方便审核员看'], answer: [0, 1, 2] },
  { key: 'A1A', type: 'multiple',
    content: docOf(p('给 Agent 的小程序开发上下文应包括？')),
    options: ['声明目标平台是微信小程序', '贴 pages.json 与相关页面', '提醒用 uni.* API 保持多端兼容', '什么都不说让它猜'], answer: [0, 1, 2] },
  { key: 'A1B', type: 'fill',
    content: docOf(p('调试数据问题先看开发者工具的 ', inputNode('AppData'), ' 面板实时查看 data 值。')),
    options: [''], answer: ['AppData'] },
  { key: 'A2A', type: 'multiple',
    content: docOf(p('小程序合规红线包括？')),
    options: ['收集信息要声明隐私协议并取得同意', '个人主体不能做支付', '请求域名须 https + 白名单', '界面颜色必须用绿色'], answer: [0, 1, 2] },
  { key: 'A2B', type: 'single',
    content: docOf(p('让 Agent 在写功能前自检"个人号能不能用这个能力"，最好的做法是？')),
    options: ['靠运气', '把审核指南写进 AGENTS.md 让它先自检', '等被拒再说', '换平台'], answer: [1] },
  { key: 'A3A', type: 'single',
    content: docOf(p('uni-app X 的终极卖点是？')),
    options: ['只能写小程序', '同一份代码跨小程序/App/Web 多端', '不需要编译', '自动写完所有需求'], answer: [1] },
  { key: 'A3B', type: 'judge',
    content: docOf(p('课程认为"过审 + 真实用户"就是小程序课的毕业证。')),
    options: JUDGE, answer: CORRECT },
  { key: 'GA1', type: 'single',
    content: docOf(p('这门课的技术栈组合是？')),
    options: ['uni-app X + 微信小程序 + AI Agent', 'Kotlin 原生开发', '纯 HTML 单页', 'SwiftUI'], answer: [0] },
  { key: 'GA2', type: 'judge',
    content: docOf(p('uni-app X 用 Vue 风格的 uvue 页面和 TypeScript 风格的 UTS 语言。')),
    options: JUDGE, answer: CORRECT },
  { key: 'GA3', type: 'single',
    content: docOf(p('uni 的 API 前缀（如 uni.request）编译到微信端会自动对接？')),
    options: ['微信开放能力', '苹果官方 API', '浏览器 API', '什么都不做'], answer: [0] },
  { key: 'GA4', type: 'judge',
    content: docOf(p('本地存储适合课程项目，正式产品建议上云（云开发或自建后端）。')),
    options: JUDGE, answer: CORRECT },
  { key: 'GA5', type: 'single',
    content: docOf(p('实战项目做的是什么小程序？')),
    options: ['班级打卡（打卡+连续天数统计+本地保存）', '外卖点餐平台', '直播 App', '浏览器'], answer: [0] },
  { key: 'GA6', type: 'single',
    content: docOf(p('课程认为小程序开发与 Agent 协作的三个关键词是？')),
    options: ['平台文档当上下文、双端差异多留心、合规红线要牢记', '多写代码少看文档', '功能越多越好', '上线后再说合规'], answer: [0] },
]

/* ---------- 章节定义 ---------- */
const CHAPTERS = [
  { key: 'GG1', name: '走进小程序开发', group: true },
  { key: 'X1', name: '微信小程序全景' },
  { key: 'X2', name: 'uni-app X 是什么？' },
  { key: 'X3', name: '环境搭建' },
  { key: 'GG2', name: 'uni-app X 基础', group: true },
  { key: 'U1', name: 'uvue：页面结构与模板语法' },
  { key: 'U2', name: 'UTS 语言基础' },
  { key: 'U3', name: '响应式与页面生命周期' },
  { key: 'U4', name: '样式与布局' },
  { key: 'GG3', name: '微信小程序能力', group: true },
  { key: 'W1', name: '页面与导航' },
  { key: 'W2', name: '交互反馈与设备能力' },
  { key: 'W3', name: '微信开放能力' },
  { key: 'GG4', name: '数据与存储', group: true },
  { key: 'S1', name: '本地存储' },
  { key: 'S2', name: '网络请求' },
  { key: 'S3', name: '后端方案选择' },
  { key: 'GG5', name: '实战项目：班级打卡小程序', group: true },
  { key: 'M1', name: '项目规划与页面设计' },
  { key: 'M2', name: '核心功能开发' },
  { key: 'M3', name: '统计与打磨' },
  { key: 'M4', name: '真机调试与发布上线' },
  { key: 'GG6', name: 'Agent 辅助心法', group: true },
  { key: 'A1', name: '小程序开发的 Agent 工作流' },
  { key: 'A2', name: '审查、合规与性能' },
  { key: 'A3', name: '进阶路线' },
]

/* ---------- 解析 md → { key: markdown } ---------- */
function parseSections() {
  const raw = fs.readFileSync(MD_FILE, 'utf8')
  const sections = {}
  let cur = null
  for (const line of raw.split('\n')) {
    const m = line.match(/^%%%%%\s*(\S+)\s*/)
    if (m) { cur = m[1]; sections[cur] = []; continue }
    if (cur) sections[cur].push(line)
  }
  for (const k of Object.keys(sections)) sections[k] = sections[k].join('\n').trim()
  return sections
}

function extractMarkers(md) {
  const keys = []
  for (const line of md.split('\n')) {
    const m = line.match(/^%%([A-Z0-9]+)%%\s*$/)
    if (m) keys.push(m[1])
  }
  return keys
}

/* ---------- 主流程 ---------- */
;(async () => {
  // 1. 登录
  const loginRes = await fetch(BASE + '/api/auth/login', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: 'admin', password: process.env.LMS_PASS }),
  }).then((r) => r.json())
  if (!loginRes.success) throw new Error('登录失败: ' + loginRes.msg)
  TOKEN = loginRes.data.token || loginRes.data.auth_token
  console.log('登录 OK')

  const sections = parseSections()
  const qmap = fs.existsSync(CHECKPOINT) ? JSON.parse(fs.readFileSync(CHECKPOINT, 'utf8')) : {}

  // 2. 幂等建题
  const defined = new Map(QUESTIONS.map((q) => [q.key, q]))
  const usedKeys = new Set()
  for (const c of CHAPTERS) {
    const md = sections[c.key]
    if (md === undefined) throw new Error(`章节 ${c.key} 缺少 markdown 内容`)
    for (const k of extractMarkers(md)) usedKeys.add(k)
  }
  const missing = [...usedKeys].filter((k) => !defined.has(k))
  if (missing.length) throw new Error('以下标记没有题目定义: ' + missing.join(', '))
  console.log(`共 ${usedKeys.size} 道题需要创建`)

  for (const key of usedKeys) {
    if (qmap[key]) { console.log(`${key} 已存在 cid=${qmap[key]}，跳过`); continue }
    const q = defined.get(key)
    const body = { course_id: COURSE_ID, name: `MINI ${key}`, type: q.type, point: 5, tags: ['miniapp'] }
    body.content = q.content
    body.options = q.options
    body.answer = q.answer
    if (q.explanation) body.explanation = q.explanation
    const issues = validateContent(q.content)
    if (issues.length) throw new Error(`${key} 题目结构问题: ${issues.join('; ')}`)
    const s = JSON.stringify(q.content)
    if (q.type === 'fill' && !s.includes('"inputs"')) throw new Error(`${key} fill 缺 inputs 节点`)
    if (q.type === 'select' && !s.includes('"select"')) throw new Error(`${key} select 缺 select 节点`)
    const created = await api('/api/questions/add', 'POST', body)
    qmap[key] = created.cid
    console.log(`${key} 建题 OK cid=${created.cid} (${q.type})`)
    fs.writeFileSync(CHECKPOINT, JSON.stringify(qmap, null, 2))
  }

  // 3. 创建缺失章节
  const existing = await api(`/api/courses/show?id=${COURSE_ID}`)
  const byName = {}
  for (const ch of existing.chapters || []) byName[ch.title] = ch.id
  for (const c of CHAPTERS) {
    if (REUSE[c.key]) { c.id = REUSE[c.key]; continue }
    if (byName[c.name]) { c.id = byName[c.name]; console.log(`章节已存在: ${c.name} id=${c.id}`); continue }
    const created = await api('/api/chapters/add', 'POST', { name: c.name, courseId: COURSE_ID, isOpen: true })
    c.id = created[0].id
    console.log(`章节创建: ${c.name} id=${c.id}`)
  }

  // 4. orders 目录树 + 课程简介
  const orders = []
  let gOrder = 0
  let currentGroup = null
  for (const c of CHAPTERS) {
    if (c.group) {
      orders.push({ id: String(c.id), label: c.name, parentId: null, order: gOrder })
      currentGroup = String(c.id)
      gOrder++
    } else if (c.top) {
      orders.push({ id: String(c.id), label: c.name, parentId: null, order: gOrder })
      gOrder++
    } else {
      orders.push({ id: String(c.id), label: c.name, parentId: currentGroup, order: orders.filter((o) => o.parentId === currentGroup).length })
    }
  }
  await api('/api/courses/update', 'POST', {
    id: COURSE_ID,
    orders,
    content: [
      '## 💬 微信小程序开发：uni-app X × AI Agent',
      '',
      '微信 10 亿用户的入口，**不用下载、点开就用** —— 用 uni-app X（Vue 风格）和 AI Agent 结对，做一个真正提审上线的微信小程序。',
      '',
      '- 🦄 **uni-app X 入门**：uvue 页面、UTS 语言、条件编译、页面生命周期',
      '- 💚 **小程序能力**：pages.json 与 tabBar、导航 API、Toast/Modal 三件套、微信开放能力',
      '- 💾 **数据方案**：本地存储、uni.request 与域名白名单、云开发/自建后端选型',
      '- 🚀 **完整实战**：班级打卡小程序 —— 规划、打卡逻辑、连续天数统计、真机预览、提审发布',
      '- 🤖 **Agent 心法**：平台文档当上下文、AppData 调试、合规红线前置自检',
      '',
      ':::callout icon=🎯',
      '课程原则：**Vue 思维写小程序，Agent 写代码，微信开发者工具里逐帧打磨。** 过审 + 真实用户 = 毕业证。',
      ':::',
    ].join('\n'),
  })
  console.log('orders 目录树 + 课程简介已更新')

  // 5. 逐章填充
  let filled = 0
  for (const c of CHAPTERS) {
    let md = sections[c.key]
    const markers = extractMarkers(md)
    const hasMarkers = markers.length > 0
    await api('/api/chapters/update', 'POST', { id: c.id, name: c.name, content: md })
    if (!hasMarkers) { filled++; console.log(`✓ ${c.key} ${c.name} (无题)`); continue }

    const chRaw = await api(`/api/chapters/show?id=${c.id}`)
    const doc = (chRaw.chapter || chRaw).content
    let replaced = 0
    const walk = (nodes) => {
      for (let i = 0; i < nodes.length; i++) {
        const n = nodes[i]
        if (n.type === 'paragraph') {
          const text = (n.content || []).map((x) => x.text || '').join('').trim()
          const m = text.match(/^%%([A-Z0-9]+)%%$/)
          if (m && qmap[m[1]]) {
            nodes[i] = { type: 'vue', attrs: { type: 'question', height: null, content: String(qmap[m[1]]) } }
            replaced++
            continue
          }
        }
        if (Array.isArray(n.content)) walk(n.content)
      }
    }
    walk(doc.content)
    if (replaced !== markers.length) throw new Error(`${c.key} 标记替换 ${replaced}/${markers.length} 不符`)
    const issues = validateContent(doc)
    if (issues.length) throw new Error(`${c.key} 结构自检失败:\n` + issues.join('\n'))
    await api('/api/chapters/update', 'POST', { id: c.id, content: doc })
    filled++
    console.log(`✓ ${c.key} ${c.name} (${replaced} 题)`)
  }

  console.log(`\n✅ 完成：${filled}/${CHAPTERS.length} 章填充，题目 cid 映射:`, JSON.stringify(qmap))
  const first = CHAPTERS.find((c) => !c.group)
  console.log(`预览: ${BASE}/course/${COURSE_ID}/${first.id}`)
})().catch((e) => {
  console.error('❌ 失败:', e.message)
  process.exit(1)
})
