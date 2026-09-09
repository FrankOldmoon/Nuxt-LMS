/**
 * 构建 Web 开发教程课程（course 14）写入 aics.oldmoon.cn
 *
 * 主题：以 Nuxt 框架为骨架、AI Agent 为开发工具的现代 Web 全栈教程（中文）
 * 结构：7 个分组（group）+ 24 个子章节，每章 2 道配套练习
 * 流程（复用 build_noi_course.cjs 模式，含 currentGroup 修复）：
 *  1. 登录 → 2. 幂等建题（checkpoint: storage/oj_problems/web_qcids.json）
 *  3. 解析 scripts/web_tutorial.md（%%%%% 分节），创建缺失章节（复用 id 10 作 "Web 是如何工作的？"）
 *  4. orders 目录树 + 课程简介 → 5. 逐章 markdown → 替换标记 → 自检 → 回存
 *
 * 用法：node scripts/build_web_course.cjs
 */
const fs = require('fs')
const path = require('path')

const BASE = 'https://aics.oldmoon.cn'
const COURSE_ID = 14
const REUSE = { W01: 10 } // "Web 是如何工作的？" 复用已有章节 10
const OUT_DIR = path.join(__dirname, '..', 'storage', 'oj_problems')
const CHECKPOINT = path.join(OUT_DIR, 'web_qcids.json')
const MD_FILE = path.join(__dirname, 'web_tutorial.md')

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
  /* ===== W01 Web 如何工作 ===== */
  { key: 'W01A', type: 'sort',
    content: docOf(p('🕸️ 把"打开网页"的过程排序：')),
    options: ['浏览器输入 URL 发起 HTTP 请求', '服务器返回 HTML/CSS/JS 等资源', '浏览器解析并渲染页面'],
    answer: sortAns(3) },
  { key: 'W01B', type: 'classify',
    content: docOf(p('🧑‍🤝‍🧑 把职责分给前端/后端：')),
    options: [
      { name: '前端 🎨（浏览器）', items: ['页面布局与样式', '按钮点击交互'] },
      { name: '后端 ⚙️（服务器）', items: ['读写数据库', '提供 API 接口'] }],
    answer: [0, 0, 1, 1] },
  /* ===== W02 Agent 范式 ===== */
  { key: 'W02A', type: 'sort',
    content: docOf(p('🔄 把本课的 Agent 开发循环排序：')),
    options: ['用清晰的提示词说明任务', 'Agent 生成代码', '审查代码并运行验证', '小步迭代修正'],
    answer: sortAns(4) },
  { key: 'W02B', type: 'judge',
    content: docOf(p('用 AI Agent 开发可以完全不懂原理——反正它会写。')),
    options: JUDGE, answer: WRONG,
    explanation: docOf(p('你越懂，产出越可控；审查能力建立在原理之上。')) },
  /* ===== W03 环境 ===== */
  { key: 'W03A', type: 'sort',
    content: docOf(p('🛠️ 把环境搭建步骤排序：')),
    options: ['安装 Node.js（LTS）', '安装/启用 pnpm 包管理器', 'pnpm create nuxt 创建项目', 'pnpm dev 启动开发服务器'],
    answer: sortAns(4) },
  { key: 'W03B', type: 'fill',
    content: docOf(p('Nuxt 开发服务器默认运行在 ', inputNode('3000'), ' 端口（localhost:3000）。')),
    options: [''], answer: ['3000'] },
  /* ===== H01 HTML ===== */
  { key: 'H01A', type: 'select',
    content: docOf(p('表示"页面主体内容"的语义化标签是 ', selectNode('<main>'))),
    options: ['<div>', '<main>', '<span>', '<body-tag>'], answer: ['<main>'] },
  { key: 'H01B', type: 'match',
    content: docOf(p('🦴 把标签与其用途匹配：')),
    options: [
      { left: '<nav>', right: '导航栏' },
      { left: '<form>', right: '收集用户输入' },
      { left: '<img>', right: '显示图片' },
      { left: '<footer>', right: '页脚信息' }],
    answer: matchAns(4) },
  /* ===== H02 CSS ===== */
  { key: 'H02A', type: 'sort',
    content: docOf(p('📦 从内到外排列 CSS 盒模型的层级：')),
    options: ['content 内容', 'padding 内边距', 'border 边框', 'margin 外边距'],
    answer: sortAns(4) },
  { key: 'H02B', type: 'single',
    content: docOf(p('让导航项"水平排列、两端对齐、垂直居中"，最合适的是？')),
    options: ['display: grid; grid-template-rows: 3', 'display: flex; justify-content: space-between; align-items: center;', 'float: left 全员', 'position: absolute 全员'], answer: [1] },
  /* ===== J01 JavaScript ===== */
  { key: 'J01A', type: 'fill',
    content: docOf(p('fetch 拿到响应后，用 ', inputNode('await'), ' ', code('res.json()'), ' 把响应体解析成 JS 对象。')),
    options: [''], answer: ['await'] },
  { key: 'J01B', type: 'single',
    content: docOf(p('document.querySelector("#btn").addEventListener("click", fn) 的作用是？')),
    options: ['创建按钮', '给 id 为 btn 的元素绑定点击事件', '删除按钮', '修改 CSS'], answer: [1] },
  /* ===== V01 Vue 组件 ===== */
  { key: 'V01A', type: 'fill',
    content: docOf(p('Vue 3 中用 ', inputNode('ref'), '() 包住数据，数据变化时视图自动更新。')),
    options: [''], answer: ['ref'] },
  { key: 'V01B', type: 'single',
    content: docOf(p('Vue 的心智模型可以概括为？')),
    options: ['手动操作 DOM 更新页面', 'UI = f(state)：改数据，视图自动更新', '网页就是一叠静态纸', '每个页面必须刷新整页'], answer: [1] },
  /* ===== V02 模板与通信 ===== */
  { key: 'V02A', type: 'match',
    content: docOf(p('🧭 把 Vue 指令与其用途匹配：')),
    options: [
      { left: 'v-for', right: '循环渲染列表' },
      { left: 'v-if', right: '条件渲染' },
      { left: ':src', right: '动态绑定属性' },
      { left: 'v-model', right: '表单双向绑定' }],
    answer: matchAns(4) },
  { key: 'V02B', type: 'single',
    content: docOf(p('子组件向父组件传消息，使用的机制是？')),
    options: ['props', 'emit 事件', '直接改父组件变量', '全局变量'], answer: [1],
    explanation: docOf(p('数据流：props 向下进，emit 向上出。')) },
  /* ===== N01 Nuxt 路由 ===== */
  { key: 'N01A', type: 'single',
    content: docOf(p('pages/courses/[id].vue 对应哪个路由？')),
    options: ['/courses/id（字面量）', '/courses/1、/courses/42 等任意 id', '无法访问', '/[id]/courses'], answer: [1] },
  { key: 'N01B', type: 'judge',
    content: docOf(p('在 Nuxt 中页面跳转应使用 <NuxtLink> 而不是 <a>，避免整页刷新。')),
    options: JUDGE, answer: CORRECT },
  /* ===== N02 布局与组件 ===== */
  { key: 'N02A', type: 'fill',
    content: docOf(p('layouts/default.vue 中的 ', inputNode('<slot />'), ' 是页面内容插入的占位。')),
    options: [''], answer: ['<slot />'] },
  { key: 'N02B', type: 'single',
    content: docOf(p('components/CourseCard.vue 创建后，页面里如何使用？')),
    options: ['必须 import 三次', '直接写 <CourseCard />（自动导入）', '只能在 index.vue 用', '要注册全局路由'], answer: [1] },
  /* ===== N03 useFetch ===== */
  { key: 'N03A', type: 'single',
    content: docOf(p('useFetch 相比手写 fetch 的核心优势是？')),
    options: ['更快地写错', '自动处理 SSR 传递、缓存防重复、加载/错误状态', '不需要网络', '自动修 bug'], answer: [1] },
  { key: 'N03B', type: 'single',
    content: docOf(p('提交表单后想重新拉取列表，应该调用？')),
    options: ['刷新浏览器', 'refresh()', '重启服务器', '清空 data'], answer: [1] },
  /* ===== N04 server/api ===== */
  { key: 'N04A', type: 'fill',
    content: docOf(p('server/api/courses.get.js 对应 ', inputNode('GET'), ' 请求 /api/courses。')),
    options: [''], answer: ['GET'] },
  { key: 'N04B', type: 'single',
    content: docOf(p('在服务端接口里读取 POST 请求体，用哪个函数？')),
    options: ['getBody()', 'readBody(event)', 'fetch(event)', 'useState()'], answer: [1] },
  /* ===== N05 状态与 composables ===== */
  { key: 'N05A', type: 'single',
    content: docOf(p('跨组件共享 SSR 安全的状态，Nuxt 推荐用？')),
    options: ['全局 window 变量', 'useState(key, () => 初始值)', 'localStorage 里存对象', '每个组件各存一份'], answer: [1] },
  { key: 'N05B', type: 'judge',
    content: docOf(p('composables（use 开头的函数）用来封装可复用逻辑，比如统一的取数函数。')),
    options: JUDGE, answer: CORRECT },
  /* ===== N06 Tailwind ===== */
  { key: 'N06A', type: 'single',
    content: docOf(p('Tailwind 的类 p-4 表示？')),
    options: ['字体大小 4', 'padding 四档间距', '位置在第 4 行', '透明度 4'], answer: [1] },
  { key: 'N06B', type: 'fill',
    content: docOf(p('Tailwind 响应式前缀 md: 表示在 ', inputNode('768'), 'px 及以上宽度生效。')),
    options: [''], answer: ['768'] },
  /* ===== P01 规划 ===== */
  { key: 'P01A', type: 'single',
    content: docOf(p('交给 Agent 的任务，哪种写法更好？')),
    options: ['"帮我做个网站"', '"在 pages/index.vue 用 useFetch 请求 /api/courses，卡片网格三列、移动端一列，卡片抽成 CourseCard 组件"', '"把网上最好的课站抄一个"', '"做一个惊天动地的网站"'], answer: [1] },
  { key: 'P01B', type: 'judge',
    content: docOf(p('大任务应该拆成 3~5 个小任务逐个交给 Agent，做完一个验证一个。')),
    options: JUDGE, answer: CORRECT },
  /* ===== P02 页面实战 ===== */
  { key: 'P02A', type: 'sort',
    content: docOf(p('🖥️ 页面开发的合理顺序：')),
    options: ['先做后端接口（哪怕是假数据）', '开发列表页与卡片组件', '开发详情页', '浏览器逐页审查（控制台/刷新/移动端）'],
    answer: sortAns(4) },
  { key: 'P02B', type: 'multiple',
    content: docOf(p('页面审查清单包括哪些检查？')),
    options: ['浏览器控制台有无报错', '直接刷新动态路由页面是否正常', '移动端宽度下布局是否正确', '代码写得够长够炫'], answer: [0, 1, 2] },
  /* ===== P03 全栈 ===== */
  { key: 'P03A', type: 'sort',
    content: docOf(p('🔌 打通留言板的顺序：')),
    options: ['写 POST 接口接收留言', '写 GET 接口返回列表', '前端表单提交 + refresh() 刷新', '浏览器/Curl 验证全链路'],
    answer: sortAns(4) },
  { key: 'P03B', type: 'single',
    content: docOf(p('全链路出问题时，推荐的排查顺序是？')),
    options: ['先单独验证 API 是否正确，再查前端', '直接重写全部代码', '先怀疑电脑坏了', '随机改代码碰运气'], answer: [0] },
  /* ===== P04 修 Bug ===== */
  { key: 'P04A', type: 'multiple',
    content: docOf(p('向 Agent 提 Bug 时应该提供哪些信息？')),
    options: ['具体现象与报错信息', '复现步骤', '你的初步猜测', '"反正就是坏了，你自己看"'], answer: [0, 1, 2] },
  { key: 'P04B', type: 'judge',
    content: docOf(p('Bug 修好后，让 Agent 解释根因是学习最快的方式之一。')),
    options: JUDGE, answer: CORRECT },
  /* ===== D01 部署 ===== */
  { key: 'D01A', type: 'single',
    content: docOf(p('生成纯静态站点（内容型网站）用哪个命令？')),
    options: ['pnpm dev', 'pnpm generate', 'pnpm install', 'node server'], answer: [1] },
  { key: 'D01B', type: 'judge',
    content: docOf(p('.env 里的密钥文件绝不能提交到公开仓库。')),
    options: JUDGE, answer: CORRECT },
  /* ===== D02 性能与 SEO ===== */
  { key: 'D02A', type: 'single',
    content: docOf(p('SSR（服务端渲染）带来的直接好处是？')),
    options: ['服务器不用联网', '首屏更快、搜索引擎能抓到内容', '不需要写 CSS', '自动生成测试'], answer: [1] },
  { key: 'D02B', type: 'fill',
    content: docOf(p('Nuxt 设置页面 SEO 元信息的 API 是 use', inputNode('SeoMeta'), '()。')),
    options: [''], answer: ['SeoMeta'] },
  /* ===== D03 安全 ===== */
  { key: 'D03A', type: 'multiple',
    content: docOf(p('以下哪些是安全底线？')),
    options: ['服务端校验所有用户输入', '密钥只放服务端/环境变量', '不用 v-html 渲染用户内容', '前端省事就不做权限检查'], answer: [0, 1, 2] },
  { key: 'D03B', type: 'single',
    content: docOf(p('Agent 大幅改动代码后，提交前应该先？')),
    options: ['直接 push 上线', 'git diff 审查改动再提交', '删掉仓库重来', '关机'], answer: [1] },
  /* ===== E01 提示词工程 ===== */
  { key: 'E01A', type: 'sort',
    content: docOf(p('📐 编码任务提示词的四要素排序：')),
    options: ['目标：要做成什么样', '上下文：相关文件与技术栈', '约束：不许改什么', '产出：直接改文件并验证'],
    answer: sortAns(4) },
  { key: 'E01B', type: 'fill',
    content: docOf(p('把项目约定（技术栈、命令、禁区）写进 ', inputNode('AGENTS.md'), '，编码 Agent 每次自动读取。')),
    options: [''], answer: ['AGENTS.md'] },
  /* ===== E02 审查 ===== */
  { key: 'E02A', type: 'sort',
    content: docOf(p('👀 四步审查法的顺序：')),
    options: ['跑起来：功能真的能用吗', '读懂它：每段代码在干嘛', '挑安全刺：输入校验与密钥', '挑风格刺：命名与项目一致性'],
    answer: sortAns(4) },
  { key: 'E02B', type: 'single',
    content: docOf(p('审查 AI 代码的高效技巧是？')),
    options: ['信任不审查', '让 Agent 以审查者视角自我复查，你做终审', '只看文件名', '随机抽查一个字'], answer: [1] },
  /* ===== E03 学习路径 ===== */
  { key: 'E03A', type: 'match',
    content: docOf(p('🗺️ 把学习资源与其定位匹配：')),
    options: [
      { left: 'nuxt.com', right: 'Nuxt 官方文档' },
      { left: 'vuejs.org', right: 'Vue 官方文档' },
      { left: 'Nuxt UI', right: '生产级组件库' }],
    answer: matchAns(3) },
  { key: 'E03B', type: 'single',
    content: docOf(p('结课作业的最好选题是？')),
    options: ['跟着教程再抄一遍', '给真实用户做一个有用的小站（社团报名页、课件库…）', '什么也不做', '只写文档不写代码'], answer: [1] },
  /* ===== Group overview questions ===== */
  { key: 'GA1', type: 'single',
    content: docOf(p('这门课的技术栈组合是？')),
    options: ['Nuxt 框架 + AI Agent 辅助开发', '纯手写汇编', '只有 HTML 不要 JS', '不用框架的静态页'], answer: [0] },
  { key: 'GA2', type: 'single',
    content: docOf(p('Web 三件套指的是？')),
    options: ['HTML、CSS、JavaScript', 'Node、pnpm、VS Code', 'CPU、内存、硬盘', 'Vue、React、Angular'], answer: [0] },
  { key: 'GA3', type: 'judge',
    content: docOf(p('学 Nuxt 之前需要先理解 Vue 的组件与响应式。')),
    options: JUDGE, answer: CORRECT },
  { key: 'GA4', type: 'single',
    content: docOf(p('Nuxt 全栈能力的四大支柱是？')),
    options: ['数据获取、服务端 API、状态管理、样式方案', '游戏、视频、音频、直播', 'MySQL、Redis、Mongo、HBase', 'H1、H2、H3、H4 标签'], answer: [0] },
  { key: 'GA5', type: 'judge',
    content: docOf(p('实战项目应该先写后端接口（哪怕是假数据），再画前端页面。')),
    options: JUDGE, answer: CORRECT },
  { key: 'GA6', type: 'single',
    content: docOf(p('把 Nuxt 应用部署到你自己的服务器，构建后用 node 运行哪个文件？')),
    options: ['nuxt.config.ts', '.output/server/index.mjs', 'package.json', 'app.vue'], answer: [1] },
  { key: 'GA7', type: 'single',
    content: docOf(p('与 AI Agent 长期协作的核心心法是？')),
    options: ['全盘信任不打折', '提示词给足上下文 + 小步提交 + 认真审查', '什么都让 AI 决定', 'AI 写完从不验证'], answer: [1] },
]

/* ---------- 章节定义 ---------- */
const CHAPTERS = [
  { key: 'G01', name: '走进 Web 开发', group: true },
  { key: 'W01', name: 'Web 是如何工作的？' },
  { key: 'W02', name: '用 AI Agent 学开发：新范式' },
  { key: 'W03', name: '搭建开发环境' },
  { key: 'G02', name: 'Web 三件套', group: true },
  { key: 'H01', name: 'HTML：页面的骨架' },
  { key: 'H02', name: 'CSS：样式与布局' },
  { key: 'J01', name: 'JavaScript：让页面动起来' },
  { key: 'G03', name: 'Vue 与 Nuxt 入门', group: true },
  { key: 'V01', name: 'Vue 组件化思维' },
  { key: 'V02', name: '模板语法与组件通信' },
  { key: 'N01', name: 'Nuxt 初体验：文件即路由' },
  { key: 'N02', name: '布局与组件复用' },
  { key: 'G04', name: 'Nuxt 核心能力', group: true },
  { key: 'N03', name: '数据获取：useFetch 与 SSR' },
  { key: 'N04', name: '服务端 API：server/api' },
  { key: 'N05', name: '状态管理：useState 与 composables' },
  { key: 'N06', name: '样式方案：Tailwind CSS' },
  { key: 'G05', name: '实战项目：用 Agent 造一个应用', group: true },
  { key: 'P01', name: '项目规划：从想法到任务清单' },
  { key: 'P02', name: '页面开发实战' },
  { key: 'P03', name: '全栈打通：API + 数据 + 表单' },
  { key: 'P04', name: '修 Bug 与迭代' },
  { key: 'G06', name: '上线与部署', group: true },
  { key: 'D01', name: '构建与部署' },
  { key: 'D02', name: '性能与 SEO' },
  { key: 'D03', name: '安全与最佳实践' },
  { key: 'G07', name: 'AI 协作心法', group: true },
  { key: 'E01', name: '提示词工程 for 编码' },
  { key: 'E02', name: '审查 AI 代码' },
  { key: 'E03', name: '学习路径与资源' },
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
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: 'admin', password: 'REDACTED' }),
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
    const body = { course_id: COURSE_ID, name: `WEB ${key}`, type: q.type, point: 5, tags: ['web'] }
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
      '## 🌐 Web 开发：Nuxt + AI Agent',
      '',
      '一门"两条腿走路"的现代 Web 全栈课程：以 **Nuxt 框架**为骨架，以 **AI Agent** 为加速器。',
      '',
      '- 🕸️ **先懂原理**：Web 工作方式、HTML/CSS/JS 三件套 —— 看懂才审查得了',
      '- 🟢 **Vue → Nuxt**：组件化、响应式、文件即路由、SSR、server/api 全栈接口',
      '- 🚀 **真项目实战**：课程卡片站从 0 到上线，每一步都是标准 Agent 工作流',
      '- 🤖 **AI 协作心法**：提示词四要素、AGENTS.md、四步审查法 —— 受用终身的元技能',
      '',
      ':::callout icon=🎯',
      '课程原则：**Agent 负责打字，你负责思考、决策与审查。** 每章的实战点都可以立刻在自己的项目里让 Agent 执行。',
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
