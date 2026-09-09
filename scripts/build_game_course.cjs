/**
 * 构建 Game 开发教程课程（course 15）写入 aics.oldmoon.cn
 *
 * 主题：AI Agent 辅助下的游戏开发 — Phaser（2D）+ Babylon.js（3D）双引擎，中文
 * 结构：6 个分组（group）+ 20 个子章节，每章 2 道配套练习
 * 流程（复用 build_web_course.cjs 模式，含 currentGroup 修复）：
 *  1. 登录 → 2. 幂等建题（checkpoint: storage/oj_problems/game_qcids.json）
 *  3. 解析 scripts/game_tutorial.md（%%%%% 分节），创建缺失章节（复用 id 11 作 "游戏开发全景"）
 *  4. orders 目录树 + 课程简介 → 5. 逐章 markdown → 替换标记 → 自检 → 回存
 *
 * 用法：node scripts/build_game_course.cjs
 */
const fs = require('fs')
const path = require('path')

const BASE = 'https://aics.oldmoon.cn'
const COURSE_ID = 15
const REUSE = { W1: 11 } // "游戏开发全景" 复用已有章节 11
const OUT_DIR = path.join(__dirname, '..', 'storage', 'oj_problems')
const CHECKPOINT = path.join(OUT_DIR, 'game_qcids.json')
const MD_FILE = path.join(__dirname, 'game_tutorial.md')

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
  /* ===== W1 游戏全景 ===== */
  { key: 'W1A', type: 'sort',
    content: docOf(p('🔁 游戏循环每帧的三步排序：')),
    options: ['读输入', '更新状态', '画一帧'],
    answer: sortAns(3) },
  { key: 'W1B', type: 'classify',
    content: docOf(p('🎮 把游戏项目匹配给合适的引擎：')),
    options: [
      { name: 'Phaser 🟦（2D）', items: ['横版平台跳跃', '弹幕射击'] },
      { name: 'Babylon 🟨（3D）', items: ['3D 场景探索', '驾驶模拟'] }],
    answer: [0, 0, 1, 1] },
  /* ===== W2 选型规划 ===== */
  { key: 'W2A', type: 'multiple',
    content: docOf(p('向 Agent 描述一个游戏需求，应该包含哪些要素？')),
    options: ['玩法：角色能做什么、胜负条件', '美术：素材策略与镜头', '数值：速度/重力/分数等具体数字', '只说"做个好玩的游戏"'], answer: [0, 1, 2] },
  { key: 'W2B', type: 'judge',
    content: docOf(p('数值写清楚（如跳跃 -500、重力 1200），Agent 一次就能调出"手感差不多"的版本。')),
    options: JUDGE, answer: CORRECT },
  /* ===== W3 环境 ===== */
  { key: 'W3A', type: 'sort',
    content: docOf(p('🛠️ 创建 Phaser 项目的步骤排序：')),
    options: ['pnpm create vite 创建项目', 'pnpm install phaser', 'pnpm dev 启动开发服务器', '把项目文件夹交给编码 Agent'],
    answer: sortAns(4) },
  { key: 'W3B', type: 'fill',
    content: docOf(p('给编码 Agent 的项目约定文件叫 ', inputNode('AGENTS.md'), '，它每次对话都会自动读取。')),
    options: [''], answer: ['AGENTS.md'] },
  /* ===== P1 Phaser 初体验 ===== */
  { key: 'P1A', type: 'sort',
    content: docOf(p('🟦 Phaser 场景的三段式生命周期：')),
    options: ['preload：加载资源', 'create：搭建场景', 'update：每帧循环'],
    answer: sortAns(3) },
  { key: 'P1B', type: 'single',
    content: docOf(p('读取键盘输入的逻辑应该写在哪里？')),
    options: ['preload', 'create', 'update', 'config'], answer: [2],
    explanation: docOf(p('create 负责摆舞台（一次），update 负责每帧演戏（读输入、更新逻辑）。')) },
  /* ===== P2 精灵动画 ===== */
  { key: 'P2A', type: 'single',
    content: docOf(p('Sprite（精灵）与 Image 的关键区别是？')),
    options: ['精灵更贵所以更慢', '精灵带物理体、可参与碰撞', '精灵只能显示动画', '没有区别'], answer: [1] },
  { key: 'P2B', type: 'judge',
    content: docOf(p('没美术素材时可以先用纯色方块/几何图形占位，跑通玩法再换正式素材。')),
    options: JUDGE, answer: CORRECT },
  /* ===== P3 输入 ===== */
  { key: 'P3A', type: 'fill',
    content: docOf(p('只有在地面才能跳跃：判断 ', code('this.player.body.touching.'), inputNode('down'), ' 为 true 才允许起跳。')),
    options: [''], answer: ['down'] },
  { key: 'P3B', type: 'single',
    content: docOf(p('漏掉"在地面才可跳"的判断，会出现什么 bug？')),
    options: ['角色不能移动', '空中无限跳', '游戏崩溃', '画面闪烁'], answer: [1] },
  /* ===== P4 物理 ===== */
  { key: 'P4A', type: 'classify',
    content: docOf(p('💥 把交互场景匹配给正确的 API：')),
    options: [
      { name: 'collider（阻挡）', items: ['玩家站在平台上', '撞墙被挡住'] },
      { name: 'overlap（穿过触发）', items: ['吃金币加分', '踩到怪物消灭它'] }],
    answer: [0, 0, 1, 1] },
  { key: 'P4B', type: 'fill',
    content: docOf(p('Arcade 物理中物体不碰撞检测的方向盒叫 ', inputNode('AABB'), '（轴对齐包围盒）。')),
    options: [''], answer: ['AABB'] },
  /* ===== M1 关卡 ===== */
  { key: 'M1A', type: 'single',
    content: docOf(p('静态平台用 setScale 缩放后，还必须调用什么才能让碰撞盒匹配？')),
    options: ['destroy()', 'refreshBody()', 'setVelocity()', 'play()'], answer: [1] },
  { key: 'M1B', type: 'judge',
    content: docOf(p('不动的平台用 staticGroup 比动态 Group 性能开销更小。')),
    options: JUDGE, answer: CORRECT },
  /* ===== M2 计分与状态 ===== */
  { key: 'M2A', type: 'fill',
    content: docOf(p('场景跳转并传数据：', code('this.scene.start('), inputNode("'GameOver'"), code(', { score })'), '。')),
    options: [''], answer: ["'GameOver'"] },
  { key: 'M2B', type: 'single',
    content: docOf(p('"玩家在下落时踩到怪物 → 消灭怪物并弹起"用哪个条件判断最简单？')),
    options: ['player.body.velocity.y > 0', 'score > 100', '怪物在动', '随机数'], answer: [0] },
  /* ===== M3 打磨 ===== */
  { key: 'M3A', type: 'multiple',
    content: docOf(p('以下哪些属于 Game Feel（游戏手感）打磨？')),
    options: ['跳跃音效', '吃金币的粒子特效', '相机跟随与震动', '把代码行数加到一万行'], answer: [0, 1, 2] },
  { key: 'M3B', type: 'judge',
    content: docOf(p('相机跟随玩家用 cameras.main.startFollow(player)。')),
    options: JUDGE, answer: CORRECT },
  /* ===== B1 Babylon 初体验 ===== */
  { key: 'B1A', type: 'match',
    content: docOf(p('🧭 把 Babylon 3D 三件套与其作用匹配：')),
    options: [
      { left: 'Camera 相机', right: '决定谁在看、从哪看' },
      { left: 'Light 灯光', right: '照亮场景产生明暗' },
      { left: 'Mesh 网格', right: '一切可见的 3D 物体' }],
    answer: matchAns(3) },
  { key: 'B1B', type: 'fill',
    content: docOf(p('Babylon 的游戏循环：', code('engine.runRenderLoop(() => scene.'), inputNode('render'), code('())'), '。')),
    options: [''], answer: ['render'] },
  /* ===== B2 材质 ===== */
  { key: 'B2A', type: 'single',
    content: docOf(p('让宝石看起来"自发光"（不受光照影响、亮亮的），应设置材质的？')),
    options: ['diffuseColor', 'emissiveColor', 'alpha', 'wireframe'], answer: [1] },
  { key: 'B2B', type: 'fill',
    content: docOf(p('Babylon 左手坐标系：x 向右、y 向', inputNode('上'), '、z 向前。')),
    options: [''], answer: ['上'] },
  /* ===== B3 输入控制 ===== */
  { key: 'B3A', type: 'single',
    content: docOf(p('让相机始终看向移动的角色，应该每帧更新？')),
    options: ['camera.target = player.position', 'camera.dispose()', 'scene.clearColor', 'engine.resize()'], answer: [0] },
  { key: 'B3B', type: 'judge',
    content: docOf(p('方向不对时打印 box.position 看数值，比"凭感觉"更靠谱。')),
    options: JUDGE, answer: CORRECT },
  /* ===== B4 碰撞拾取 ===== */
  { key: 'B4A', type: 'single',
    content: docOf(p('Babylon 中"带碰撞的移动"（会滑墙、落地）用哪个方法？')),
    options: ['position += 0.1', 'moveWithCollisions()', 'setVelocity()', 'translateX()'], answer: [1] },
  { key: 'B4B', type: 'single',
    content: docOf(p('点击鼠标选中 3D 物体（点击拾取）依赖哪个 API？')),
    options: ['scene.pick(x, y)', 'camera.attachControl()', 'engine.resize()', 'mesh.clone()'], answer: [0] },
  /* ===== N1 场景搭建 ===== */
  { key: 'N1A', type: 'fill',
    content: docOf(p('让宝石每帧"自转 + 浮动"，应在 ', inputNode('onBeforeRenderObservable'), '（每帧回调）里更新 rotation.y 与 position.y。')),
    options: [''], answer: ['onBeforeRenderObservable'] },
  { key: 'N1B', type: 'judge',
    content: docOf(p('"自转 + 上下浮动"这类氛围动画，最适合描述给 Agent 批量生成。')),
    options: JUDGE, answer: CORRECT },
  /* ===== N2 计分 ===== */
  { key: 'N2A', type: 'single',
    content: docOf(p('3D 中判断"角色与宝石距离足够近"，最直接的 API 是？')),
    options: ['Vector3.Distance(a, b) < 阈值', 'a.x === b.x', '比较材质颜色', '随机数'], answer: [0] },
  { key: 'N2B', type: 'fill',
    content: docOf(p('倒计时按真实时间走：每帧减 engine.', inputNode('getDeltaTime'), '() / 1000，避免帧率不同导致速度不同。')),
    options: [''], answer: ['getDeltaTime'] },
  /* ===== N3 发布 ===== */
  { key: 'N3A', type: 'single',
    content: docOf(p('Babylon 游戏构建后得到 dist/ 纯静态文件，如何发布？')),
    options: ['必须上架应用商店', '传到任意静态托管即可发链接开玩', '只能拷贝源码给同学', '无法在浏览器外运行'], answer: [1] },
  { key: 'N3B', type: 'judge',
    content: docOf(p('找同学试玩并记录卡点，是发现游戏问题的最好方式之一。')),
    options: JUDGE, answer: CORRECT },
  /* ===== A1 Agent 工作流 ===== */
  { key: 'A1A', type: 'sort',
    content: docOf(p('🔁 Agent 游戏开发迭代节奏：')),
    options: ['方块占位先跑通核心玩法', '逐个加料（金币→怪物→音效）', '每轮自己试玩验证手感', '汇总反馈进入下一轮'],
    answer: sortAns(4) },
  { key: 'A1B', type: 'single',
    content: docOf(p('为什么游戏 bug 不能只靠代码审查发现？')),
    options: ['代码审查没意义', '数值类问题（重力 1200 vs 12000）不报错，只能试玩发现', 'Agent 从不写错代码', '游戏没有 bug'], answer: [1] },
  /* ===== A2 美术资源 ===== */
  { key: 'A2A', type: 'multiple',
    content: docOf(p('零美术基础时，Agent 可以帮你生成哪些素材？')),
    options: ['几何图形占位角色', '程序化 spritesheet（canvas 脚本生成）', 'Emoji 当精灵（🦊🍕💎）', '自动下载任意版权图片'], answer: [0, 1, 2] },
  { key: 'A2B', type: 'fill',
    content: docOf(p('让 Agent 生成素材时最关键的约束是：先统一', inputNode('风格'), '再谈细节。')),
    options: [''], answer: ['风格'] },
  /* ===== A3 调参验收 ===== */
  { key: 'A3A', type: 'sort',
    content: docOf(p('🔧 数值调试工作流排序：')),
    options: ['数值集中到 CONFIG 对象', '改一处参数', '刷新试玩验证手感', '记录每版数值'],
    answer: sortAns(4) },
  { key: 'A3B', type: 'judge',
    content: docOf(p('让 Agent 给游戏加 debug 模式（显示碰撞盒、飞行、跳关）能大幅提升迭代速度。')),
    options: JUDGE, answer: CORRECT },
  /* ===== Group overview questions ===== */
  { key: 'GA1', type: 'single',
    content: docOf(p('这门课使用的两个游戏引擎是？')),
    options: ['Phaser（2D）+ Babylon.js（3D）', 'Unity + Unreal', 'Minecraft + Roblox', '只有 PPT 引擎'], answer: [0] },
  { key: 'GA2', type: 'judge',
    content: docOf(p('Phaser 的 create 负责搭建场景（只跑一次），update 负责每帧循环。')),
    options: JUDGE, answer: CORRECT },
  { key: 'GA3', type: 'single',
    content: docOf(p('Phaser 实战项目做的是什么游戏？')),
    options: ['横版平台跳跃（金币+怪物+计分）', '大型多人在线网游', '赛车模拟器', '文字冒险'], answer: [0] },
  { key: 'GA4', type: 'single',
    content: docOf(p('进入 3D 世界后，比 2D 多出的"三件套"是？')),
    options: ['相机、灯光、材质/网格', 'HTML、CSS、JS', '键盘、鼠标、手柄', '重力、摩擦、空气'], answer: [0] },
  { key: 'GA5', type: 'judge',
    content: docOf(p('Babylon 实战项目是在 3D 场景中收集发光宝石并限时计分。')),
    options: JUDGE, answer: CORRECT },
  { key: 'GA6', type: 'single',
    content: docOf(p('Agent 辅助游戏开发的核心分工是？')),
    options: ['Agent 出创意，你打字', '你出创意和审查，Agent 写代码，一起试玩调手感', '全交给 Agent', '全手写不用 Agent'], answer: [1] },
]

/* ---------- 章节定义 ---------- */
const CHAPTERS = [
  { key: 'GG1', name: '走进游戏开发', group: true },
  { key: 'W1', name: '游戏开发全景' },
  { key: 'W2', name: '选型与项目规划' },
  { key: 'W3', name: '环境搭建' },
  { key: 'GG2', name: 'Phaser 2D 核心', group: true },
  { key: 'P1', name: 'Phaser 初体验：第一个场景' },
  { key: 'P2', name: '精灵与动画' },
  { key: 'P3', name: '输入与控制' },
  { key: 'P4', name: 'Arcade 物理与碰撞' },
  { key: 'GG3', name: 'Phaser 实战：平台跳跃', group: true },
  { key: 'M1', name: '关卡与平台搭建' },
  { key: 'M2', name: '计分、生命与游戏状态' },
  { key: 'M3', name: '音效与打磨' },
  { key: 'GG4', name: 'Babylon 3D 核心', group: true },
  { key: 'B1', name: 'Babylon 初体验：第一个 3D 场景' },
  { key: 'B2', name: '网格、材质与纹理' },
  { key: 'B3', name: '3D 输入与角色控制' },
  { key: 'B4', name: '碰撞与拾取' },
  { key: 'GG5', name: 'Babylon 实战：3D 收集游戏', group: true },
  { key: 'N1', name: '搭建 3D 游戏场景' },
  { key: 'N2', name: '角色控制与计分逻辑' },
  { key: 'N3', name: '打磨与发布' },
  { key: 'GG6', name: 'Agent 辅助游戏开发心法', group: true },
  { key: 'A1', name: '游戏开发的 Agent 工作流' },
  { key: 'A2', name: '让 Agent 生成美术资源' },
  { key: 'A3', name: '调参、调试与验收' },
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
    const body = { course_id: COURSE_ID, name: `GAME ${key}`, type: q.type, point: 5, tags: ['game'] }
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
      '## 🎮 游戏开发：Phaser × Babylon × AI Agent',
      '',
      '一门"做出真游戏"的实战课程 —— 用 **Phaser** 做 2D 平台跳跃，用 **Babylon.js** 做 3D 收集游戏，全程 **AI Agent 结对开发**。',
      '',
      '- 🟦 **Phaser 2D**：场景生命周期、精灵动画、输入控制、Arcade 物理 → 完整平台跳跃游戏',
      '- 🟨 **Babylon 3D**：相机/灯光/网格、材质纹理、碰撞拾取 → 3D 收集游戏并发布',
      '- 🤖 **Agent 工作流**：玩法+美术+数值三段式提示词、占位素材策略、试玩迭代节奏',
      '- ✨ **Game Feel**：音效粒子、相机震动、数值调试 —— 让游戏"上头"的细节',
      '',
      ':::callout icon=🎯',
      '课程原则：**创意你出，代码 Agent 写，手感大家一起试。** 每章都有可以直接丢给 Agent 的提示词示例。',
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
