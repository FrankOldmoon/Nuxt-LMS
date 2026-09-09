/**
 * 构建 App 开发教程课程（course 16）写入 aics.oldmoon.cn
 *
 * 主题：Flutter + AI Agent 的跨平台 App 开发（Dart / Widget / 状态 / 持久化 / 发布），中文
 * 结构：6 个分组（group）+ 21 个子章节，每章 2 道配套练习
 * 流程（复用模板，含 currentGroup 修复）：
 *  1. 登录 → 2. 幂等建题（checkpoint: storage/oj_problems/app_qcids.json）
 *  3. 解析 scripts/app_tutorial.md（%%%%% 分节），创建缺失章节（复用 id 12 作 "App 开发全景"）
 *  4. orders 目录树 + 课程简介 → 5. 逐章 markdown → 替换标记 → 自检 → 回存
 *
 * 用法：node scripts/build_app_course.cjs
 */
const fs = require('fs')
const path = require('path')

const BASE = 'https://aics.oldmoon.cn'
const COURSE_ID = 16
const REUSE = { K1: 12 } // "App 开发全景" 复用已有章节 12
const OUT_DIR = path.join(__dirname, '..', 'storage', 'oj_problems')
const CHECKPOINT = path.join(OUT_DIR, 'app_qcids.json')
const MD_FILE = path.join(__dirname, 'app_tutorial.md')

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
  /* ===== K1 App 全景 ===== */
  { key: 'K1A', type: 'single',
    content: docOf(p('Flutter 的最大卖点是什么？')),
    options: ['只能开发 iOS', '一套代码多端运行，UI 一致', '不需要写代码', '只能做游戏'], answer: [1] },
  { key: 'K1B', type: 'single',
    content: docOf(p('Flutter 使用的编程语言是？')),
    options: ['Kotlin', 'Swift', 'Dart', 'Python'], answer: [2] },
  /* ===== K2 环境 ===== */
  { key: 'K2A', type: 'sort',
    content: docOf(p('🛠️ Flutter 环境搭建顺序：')),
    options: ['安装 Flutter SDK 并加入 PATH', '运行 flutter doctor 体检', '安装 VS Code + Flutter 插件', 'flutter create 创建项目并 run'],
    answer: sortAns(4) },
  { key: 'K2B', type: 'fill',
    content: docOf(p('环境出问题时把 ', inputNode('flutter doctor'), ' 的完整输出贴给 Agent，让它带你修。')),
    options: [''], answer: ['flutter doctor'] },
  /* ===== K3 Agent 工作流 ===== */
  { key: 'K3A', type: 'sort',
    content: docOf(p('🔄 App 版 Agent 工作流排序：')),
    options: ['用文字说清界面与交互', 'Agent 生成 Dart 文件', '热重载立刻验证', '审查 widget 树与状态位置'],
    answer: sortAns(4) },
  { key: 'K3B', type: 'judge',
    content: docOf(p('描述界面时用"屏幕上有什么、点什么会发生什么"的界面语言，Agent 理解得最准。')),
    options: JUDGE, answer: CORRECT },
  /* ===== D1 Dart 上手 ===== */
  { key: 'D1A', type: 'fill',
    content: docOf(p('空安全写法：', code('nickname?.length ?? 0'), ' 中，', code('??'), ' 的作用是空值', inputNode('兜底'), '（提供默认值）。')),
    options: [''], answer: ['兜底'] },
  { key: 'D1B', type: 'single',
    content: docOf(p('String? 与 String 的区别是？')),
    options: ['没有区别', 'String? 可以为 null，String 不允许为 null', 'String? 更快', 'String? 只能存数字'], answer: [1] },
  /* ===== D2 集合异步 ===== */
  { key: 'D2A', type: 'match',
    content: docOf(p('📚 把 Dart 集合操作匹配给用途：')),
    options: [
      { left: 'map()', right: '逐个转换出新列表' },
      { left: 'where()', right: '按条件过滤' },
      { left: 'add()', right: '往 List 末尾追加' }],
    answer: matchAns(3) },
  { key: 'D2B', type: 'single',
    content: docOf(p('数据"晚一拍"才出现，最可能漏写了？')),
    options: ['分号', 'await', '注释', 'import'], answer: [1] },
  /* ===== D3 OOP ===== */
  { key: 'D3A', type: 'sort',
    content: docOf(p('🏗️ 数据模型类 Task 的"三件套"：')),
    options: ['字段定义（title、done）', 'toJson()：对象转 Map', 'fromJson()：Map 转对象'],
    answer: sortAns(3) },
  { key: 'D3B', type: 'single',
    content: docOf(p('Task({required this.title, this.done = false}) 中 done = false 表示？')),
    options: ['命名参数且带默认值', 'done 必填', 'done 是函数', '语法错误'], answer: [0] },
  /* ===== F1 Widget ===== */
  { key: 'F1A', type: 'match',
    content: docOf(p('🧩 把 Flutter 骨架组件匹配给用途：')),
    options: [
      { left: 'MaterialApp', right: 'App 根，提供主题与导航' },
      { left: 'Scaffold', right: '页面骨架（栏/体/悬浮按钮）' },
      { left: 'AppBar', right: '顶部标题栏' }],
    answer: matchAns(3) },
  { key: 'F1B', type: 'single',
    content: docOf(p('计数器会随点击变化，应该用 StatelessWidget 还是 StatefulWidget？')),
    options: ['StatelessWidget', 'StatefulWidget', '都不能', '必须用 Scaffold'], answer: [1],
    explanation: docOf(p('口诀：数据会变就是 Stateful。')) },
  /* ===== F2 布局 ===== */
  { key: 'F2A', type: 'classify',
    content: docOf(p('📐 把布局 Widget 匹配给用途：')),
    options: [
      { name: '排列类', items: ['Row 横排', 'Column 竖排'] },
      { name: '容器/弹性类', items: ['Container 盒子', 'Expanded 占满剩余空间'] }],
    answer: [0, 0, 1, 1] },
  { key: 'F2B', type: 'single',
    content: docOf(p('内容超出屏幕需要滚动，应该用？')),
    options: ['Row', 'ListView', 'Text', 'SizedBox'], answer: [1] },
  /* ===== F3 状态 ===== */
  { key: 'F3A', type: 'fill',
    content: docOf(p('改了列表数据界面却不动，多半是忘记把改动包进 ', inputNode('setState'), '()。')),
    options: [''], answer: ['setState'] },
  { key: 'F3B', type: 'judge',
    content: docOf(p('状态提升：父子组件共用的状态，应该放在父级管理。')),
    options: JUDGE, answer: CORRECT },
  /* ===== F4 导航 ===== */
  { key: 'F4A', type: 'single',
    content: docOf(p('导航栈的行为像？')),
    options: ['一叠盘子：push 放上新页面，pop 拿掉回到上一页', '队列先进先出', '随机访问数组', '树形搜索'], answer: [0] },
  { key: 'F4B', type: 'fill',
    content: docOf(p('页面 A 跳到 B：', code('await Navigator.'), inputNode('push'), code('(context, ...)'), '；B 返回：Navigator.pop(context, 结果)。')),
    options: [''], answer: ['push'] },
  /* ===== S1 表单 ===== */
  { key: 'S1A', type: 'single',
    content: docOf(p('读取并清空 TextField 内容，用什么对象？')),
    options: ['TextEditingController', 'setState', 'FutureBuilder', 'ThemeData'], answer: [0] },
  { key: 'S1B', type: 'judge',
    content: docOf(p('提交前用 trim().isEmpty 判断空内容并给提示，是最基本的输入校验。')),
    options: JUDGE, answer: CORRECT },
  /* ===== S2 列表 ===== */
  { key: 'S2A', type: 'single',
    content: docOf(p('长列表高性能构建（只画屏幕内的项）用？')),
    options: ['Column + for 循环', 'ListView.builder', 'SingleChildScrollView', 'Stack'], answer: [1] },
  { key: 'S2B', type: 'fill',
    content: docOf(p('左滑删除手势的组件叫 ', inputNode('Dismissible'), '。')),
    options: [''], answer: ['Dismissible'] },
  /* ===== S3 持久化 ===== */
  { key: 'S3A', type: 'single',
    content: docOf(p('本课用 shared_preferences 存任务列表，存储格式是？')),
    options: ['直接存对象', '对象 → toJson → jsonEncode → 字符串', '存截图', '存二进制日志'], answer: [1] },
  { key: 'S3B', type: 'fill',
    content: docOf(p('App 启动时在 ', inputNode('initState'), ' 里读取保存的任务，恢复数据。')),
    options: [''], answer: ['initState'] },
  /* ===== S4 网络 ===== */
  { key: 'S4A', type: 'match',
    content: docOf(p('🌐 FutureBuilder 三态匹配：')),
    options: [
      { left: 'ConnectionState.waiting', right: '显示加载圈' },
      { left: 'hasError', right: '显示错误提示' },
      { left: '有数据', right: '渲染数据列表' }],
    answer: matchAns(3) },
  { key: 'S4B', type: 'single',
    content: docOf(p('网络响应先检查什么再解析？')),
    options: ['statusCode 是否 200', '文字长度', '图片尺寸', '颜色'], answer: [0] },
  /* ===== T1 规划 ===== */
  { key: 'T1A', type: 'multiple',
    content: docOf(p('写代码之前，App 一页纸规划应包含？')),
    options: ['页面清单与交互', '状态设计（谁管什么数据）', '数据模型与持久化方案', '验收标准'], answer: [0, 1, 2, 3] },
  { key: 'T1B', type: 'single',
    content: docOf(p('本课待办 App 的验收标准是什么？')),
    options: ['代码行数最多', '杀掉 App 重开后数据还在', '用了最多插件', '界面五彩斑斓'], answer: [1] },
  /* ===== T2 页面 ===== */
  { key: 'T2A', type: 'sort',
    content: docOf(p('🖥️ 核心页面迭代顺序：')),
    options: ['主页骨架 + 假数据列表', '悬浮按钮弹出添加', '勾选与滑动删除', '热重载验证每一步'],
    answer: sortAns(4) },
  { key: 'T2B', type: 'judge',
    content: docOf(p('每个小步完成后立刻热重载试玩，问题当场反馈当场改，不攒债。')),
    options: JUDGE, answer: CORRECT },
  /* ===== T3 持久化打磨 ===== */
  { key: 'T3A', type: 'multiple',
    content: docOf(p('体验打磨可以加哪些？')),
    options: ['空状态插图（"今天没安排 🎉"）', 'Material 3 主题色', 'AppBar 进度徽标', '深色模式'], answer: [0, 1, 2, 3] },
  { key: 'T3B', type: 'fill',
    content: docOf(p('每次增删改任务后都要调用保存函数，把列表 ', inputNode('持久化'), ' 到 shared_preferences。')),
    options: [''], answer: ['持久化'] },
  /* ===== T4 调试 ===== */
  { key: 'T4A', type: 'single',
    content: docOf(p('改了 initState 里的初始化逻辑，热重载（r）不生效，应该？')),
    options: ['多按几次 r', '热重启（R）或全量重启', '删掉项目重来', '改代码长度'], answer: [1] },
  { key: 'T4B', type: 'fill',
    content: docOf(p('布局出现黄黑条纹（溢出），99% 是 Row 里的子项没有约束，套个 ', inputNode('Expanded'), ' 就好。')),
    options: [''], answer: ['Expanded'] },
  /* ===== R1 发布 ===== */
  { key: 'R1A', type: 'single',
    content: docOf(p('生成发给同学直接安装的安卓安装包，命令是？')),
    options: ['flutter run', 'flutter build apk', 'flutter clean', 'flutter doctor'], answer: [1] },
  { key: 'R1B', type: 'fill',
    content: docOf(p('一键生成全尺寸 App 图标的包叫 flutter_', inputNode('launcher_icons'), '。')),
    options: [''], answer: ['launcher_icons'] },
  /* ===== R2 UI 打磨 ===== */
  { key: 'R2A', type: 'single',
    content: docOf(p('一行代码实现容器尺寸/颜色过渡动画，用？')),
    options: ['AnimatedContainer', 'static final', 'print()', 'Scaffold'], answer: [0] },
  { key: 'R2B', type: 'judge',
    content: docOf(p('主题色收敛到 ThemeData 一处定义，全 App 自动跟随（含深色模式）。')),
    options: JUDGE, answer: CORRECT },
  /* ===== R3 心法 ===== */
  { key: 'R3A', type: 'sort',
    content: docOf(p('🧭 Agent 协作四心法排序：')),
    options: ['用界面语言描述需求', '热重载小步快跑', '报错全文直接贴给 Agent', '审查 widget 树、该抽组件就抽'],
    answer: sortAns(4) },
  { key: 'R3B', type: 'single',
    content: docOf(p('App 状态膨胀后，推荐的进阶状态管理方案是？')),
    options: ['更多 setState 嵌套', 'Provider → Riverpod / Bloc', '把状态存进文件名', '不用状态'], answer: [1] },
  /* ===== Group overview questions ===== */
  { key: 'GA1', type: 'single',
    content: docOf(p('这门课的技术栈组合是？')),
    options: ['Flutter + AI Agent 结对开发', 'Swift 纯原生', '网页套壳', 'PowerPoint 动画'], answer: [0] },
  { key: 'GA2', type: 'judge',
    content: docOf(p('Dart 的 null safety（?. 与 ??）在编译期就能拦住空指针问题。')),
    options: JUDGE, answer: CORRECT },
  { key: 'GA3', type: 'single',
    content: docOf(p('Flutter 的核心心智模型是？')),
    options: ['一切皆 Widget（UI 是嵌套的组件树）', '一切皆文件', '一切皆函数', '一切皆数据库'], answer: [0] },
  { key: 'GA4', type: 'judge',
    content: docOf(p('真实 App 的四大功能模块是：表单、列表、持久化、网络。')),
    options: JUDGE, answer: CORRECT },
  { key: 'GA5', type: 'single',
    content: docOf(p('实战项目做的是什么 App？')),
    options: ['待办清单（列表/添加/勾选/滑动删除/本地保存）', '大型网络游戏', '短视频平台', '操作系统'], answer: [0] },
  { key: 'GA6', type: 'single',
    content: docOf(p('App 完成的定义（课程观点）是？')),
    options: ['写完代码就算完', '打包装到真实用户手机上并收到反馈', '测试全绿', '截图好看'], answer: [1] },
]

/* ---------- 章节定义 ---------- */
const CHAPTERS = [
  { key: 'GG1', name: '走进 App 开发', group: true },
  { key: 'K1', name: 'App 开发全景' },
  { key: 'K2', name: '环境搭建' },
  { key: 'K3', name: '用 Agent 学 App 开发' },
  { key: 'GG2', name: 'Dart 语言基础', group: true },
  { key: 'D1', name: 'Dart 快速上手' },
  { key: 'D2', name: '集合与异步' },
  { key: 'D3', name: 'Dart 面向对象' },
  { key: 'GG3', name: 'Flutter 核心：Widget', group: true },
  { key: 'F1', name: '一切皆 Widget' },
  { key: 'F2', name: '布局 Widget' },
  { key: 'F3', name: '状态管理：setState' },
  { key: 'F4', name: '导航与路由' },
  { key: 'GG4', name: '实战功能模块', group: true },
  { key: 'S1', name: '表单与输入' },
  { key: 'S2', name: '列表与交互' },
  { key: 'S3', name: '数据持久化' },
  { key: 'S4', name: '网络请求与 JSON' },
  { key: 'GG5', name: '实战项目：待办清单 App', group: true },
  { key: 'T1', name: 'App 规划与任务拆解' },
  { key: 'T2', name: '核心页面开发' },
  { key: 'T3', name: '持久化与体验打磨' },
  { key: 'T4', name: '调试与热重载工作流' },
  { key: 'GG6', name: '发布与心法', group: true },
  { key: 'R1', name: '多平台构建与发布' },
  { key: 'R2', name: 'UI 规范与体验打磨' },
  { key: 'R3', name: 'Agent 协作心法与进阶' },
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
    const body = { course_id: COURSE_ID, name: `APP ${key}`, type: q.type, point: 5, tags: ['app'] }
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
      '## 📱 Flutter App 开发 × AI Agent',
      '',
      '一套代码跑遍安卓 / iOS / Web —— 用 **Flutter** 和 **AI Agent 结对**，从零做出一个真正能装进手机的 App。',
      '',
      '- 🦋 **Flutter 上手**：一切皆 Widget、热重载、Dart 语言（null safety 是招牌）',
      '- 🧩 **四大地基**：Widget 树、布局、setState 状态管理、导航路由',
      '- 🔧 **四大模块**：表单校验、长列表交互、shared_preferences 持久化、网络与 FutureBuilder',
      '- 🚀 **完整实战**：待办清单 App —— 规划、开发、打磨、调试、打包 APK 交给真实用户',
      '- 🤖 **Agent 心法**：界面语言沟通、热重载节奏、报错即上下文',
      '',
      ':::callout icon=🎯',
      '课程原则：**界面你描述，代码 Agent 生成，热重载里逐帧打磨。** 结课作业：为真实用户交付一个 App。',
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
