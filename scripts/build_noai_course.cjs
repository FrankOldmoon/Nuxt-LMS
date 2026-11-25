/**
 * 构建 NOAI 备考课程（course 9）写入 aics.oldmoon.cn
 *
 * 大纲：NOAI（全国人工智能奥林匹克，IOAI 中国区）最新大纲 —
 *   水平测试：Python 编程基础 / 基础数据结构 / AI 基本概念与算法（纸笔 120 分钟）
 *   中国站：sklearn / PyTorch 解决真实 AI 问题
 * 结构：6 个分组（group）+ 23 个子章节，中文，每章 2 道配套练习
 * 流程（复用 build_agent_course.cjs 模式，含 currentGroup 修复）：
 *  1. 登录 → 2. 幂等建题（checkpoint: storage/oj_problems/noai_qcids.json）
 *  3. 解析 scripts/noai_tutorial.md（%%%%% 分节），创建缺失章节（复用 id 16 作 "NOAI 是什么？"）
 *  4. orders 目录树 + 课程简介 → 5. 逐章 markdown → 替换标记 → 自检 → 回存
 *
 * 用法：node scripts/build_noai_course.cjs
 */
const fs = require('fs')
const path = require('path')

const BASE = 'https://aics.oldmoon.cn'
const COURSE_ID = 9
const REUSE = { N01: 16 } // "NOAI 是什么？" 复用已有章节 16
const OUT_DIR = path.join(__dirname, '..', 'storage', 'oj_problems')
const CHECKPOINT = path.join(OUT_DIR, 'noai_qcids.json')
const MD_FILE = path.join(__dirname, 'noai_tutorial.md')

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
  /* ===== N01 NOAI 是什么 ===== */
  { key: 'NQ1', type: 'judge',
    content: docOf(p('NOAI 唯一指定的考试语言是 Python。')),
    options: JUDGE, answer: CORRECT },
  { key: 'NQ2', type: 'single',
    content: docOf(p('水平测试排名前多少名可以晋级 NOAI 中国站？')),
    options: ['前 50', '前 100', '前 200', '前 500'], answer: [2] },
  /* ===== N02 考纲 ===== */
  { key: 'NQ3', type: 'multiple',
    content: docOf(p('以下哪些属于 NOAI 水平测试的考察板块？')),
    options: ['Python 编程基础', '基础数据结构', '人工智能基本概念与算法', '高等数学证明题'], answer: [0, 1, 2] },
  { key: 'NQ4', type: 'fill',
    content: docOf(p('NOAI 水平测试为线下纸笔考，限时 ', inputNode('120'), ' 分钟，满分 100 分。')),
    options: [''], answer: ['120'] },
  /* ===== N03 三大学派 ===== */
  { key: 'NQ5', type: 'single',
    content: docOf(p('"模拟人脑神经元连接来实现智能"属于哪个学派？')),
    options: ['符号主义', '连接主义', '行为主义', '形式主义'], answer: [1] },
  { key: 'NQ6', type: 'match',
    content: docOf(p('🏛️ 把代表性成果与其学派匹配：')),
    options: [
      { left: '专家系统 / 知识图谱', right: '符号主义' },
      { left: '神经网络 / 深度学习', right: '连接主义' },
      { left: '强化学习 / 机器人控制', right: '行为主义' }],
    answer: matchAns(3) },
  /* ===== N04 Python 语法 ===== */
  { key: 'NQ7', type: 'fill',
    content: docOf(p('Python 的 ', code('input()'), ' 永远返回的类型是 ', inputNode('字符串'), '，做数学运算前要手动转换。')),
    options: [''], answer: ['字符串'] },
  { key: 'NQ8', type: 'single',
    content: docOf(p(code('range(1, 6)'), ' 依次产生哪些数？')),
    options: ['1 2 3 4 5 6', '1 2 3 4 5', '0 1 2 3 4 5', '1 2 3 4 5 6 7'], answer: [1],
    explanation: docOf(p('range(1, 6) 从 1 到 6（不含）—— stop 永远取不到。')) },
  /* ===== N05 函数与模块 ===== */
  { key: 'NQ9', type: 'single',
    content: docOf(p('一个 Python 函数体内没有写 ', code('return'), '，调用它得到什么？')),
    options: ['0', 'None', '空字符串', '报错'], answer: [1] },
  { key: 'NQ10', type: 'select',
    content: docOf(p('统计列表中每个元素出现次数，最方便的工具是 ', selectNode('collections.Counter'))),
    options: ['collections.Counter', 'math.sqrt', 'heapq.heappush', 'itertools.chain'], answer: ['collections.Counter'] },
  /* ===== N06 列表与字典 ===== */
  { key: 'NQ11', type: 'single',
    content: docOf(p(code('[x * x for x in range(4)]'), ' 的结果是？')),
    options: ['[1, 4, 9, 16]', '[0, 1, 4, 9]', '[0, 2, 4, 6]', '[1, 2, 3]'], answer: [1] },
  { key: 'NQ12', type: 'fill',
    content: docOf(p('手写词频统计：', code('count[ch] = count.get(ch, '), inputNode('0'), code(') + 1'), ' —— 缺省值填 ', inputNode('0'), '。')),
    options: [''], answer: ['0'] },
  /* ===== N07 字符串与文件 ===== */
  { key: 'NQ13', type: 'fill',
    content: docOf(p('用 ', code('open()'), ' 读取中文文件时必须指定编码为 ', inputNode('utf-8'), '，否则可能乱码。')),
    options: [''], answer: ['utf-8'] },
  { key: 'NQ14', type: 'single',
    content: docOf(p(code('"-".join(["a", "b", "c"])'), ' 的结果是？')),
    options: ['"abc"', '"a-b-c"', '"a,b,c"', '报错'], answer: [1],
    explanation: docOf(p('join 用分隔符把序列元素连接成一个字符串。')) },
  /* ===== N08 栈队列链表 ===== */
  { key: 'NQ15', type: 'single',
    content: docOf(p('栈（Stack）的特点是？')),
    options: ['先进先出', '后进先出', '随机存取', '自动排序'], answer: [1] },
  { key: 'NQ16', type: 'select',
    content: docOf(p('BFS（广度优先搜索）的核心数据结构是 ', selectNode('队列（deque）'))),
    options: ['栈', '队列（deque）', '哈希表', '二叉树'], answer: ['队列（deque）'] },
  /* ===== N09 哈希表 ===== */
  { key: 'NQ17', type: 'single',
    content: docOf(p('哈希表平均情况下的查找复杂度是？')),
    options: ['O(1)', 'O(log n)', 'O(n)', 'O(n²)'], answer: [0] },
  { key: 'NQ18', type: 'fill',
    content: docOf(p('"两数之和"用哈希表记录见过的数，把暴力 O(n²) 优化到 O(', inputNode('n'), ')。')),
    options: [''], answer: ['n'] },
  /* ===== N10 树与图 ===== */
  { key: 'NQ19', type: 'judge',
    content: docOf(p('对二叉搜索树做中序遍历（左→根→右），得到的序列是有序的。')),
    options: JUDGE, answer: CORRECT },
  { key: 'NQ20', type: 'single',
    content: docOf(p('迷宫问题求"最少步数"，应该用哪种算法？')),
    options: ['DFS 深度优先', 'BFS 广度优先', '随机游走', '冒泡排序'], answer: [1],
    explanation: docOf(p('BFS 一层层扩展，第一次到达终点时的路径一定最短。')) },
  /* ===== N11 排序与查找 ===== */
  { key: 'NQ21', type: 'single',
    content: docOf(p('二分查找的必要前提是？')),
    options: ['数据量小', '数据有序', '数据是数字', '数据无重复'], answer: [1] },
  { key: 'NQ22', type: 'fill',
    content: docOf(p('对 100 万个有序数据做二分查找，最多比较约 ', inputNode('20'), ' 次（2 的 20 次方 ≈ 100 万）。')),
    options: [''], answer: ['20'] },
  /* ===== N12 机器学习概念 ===== */
  { key: 'NQ23', type: 'single',
    content: docOf(p('"根据面积、地段等特征预测房价（连续数值）"属于哪类任务？')),
    options: ['分类', '回归', '聚类', '强化学习'], answer: [1] },
  { key: 'NQ24', type: 'classify',
    content: docOf(p('🎓 把任务按学习范式分类：')),
    options: [
      { name: '监督学习 🏷️', items: ['垃圾邮件分类', '房价预测'] },
      { name: '无监督学习 🧩', items: ['客户群体聚类', '数据降维'] }],
    answer: [0, 0, 1, 1] },
  /* ===== N13 数据与特征 ===== */
  { key: 'NQ25', type: 'single',
    content: docOf(p('把特征缩放到 [0, 1] 区间的预处理操作叫？')),
    options: ['归一化', '独热编码', '分词', '剪枝'], answer: [0] },
  { key: 'NQ26', type: 'sort',
    content: docOf(p('🧹 把机器学习工作流的步骤排好序：')),
    options: ['收集数据', '预处理与特征工程', '训练模型', '在测试集上评估'],
    answer: sortAns(4) },
  /* ===== N14 模型评估 ===== */
  { key: 'NQ27', type: 'fill',
    content: docOf(p('TP=40, FP=10, FN=20，则精确率 Precision = 40/(40+10) = ', inputNode('0.8'), '。')),
    options: [''], answer: ['0.8'] },
  { key: 'NQ28', type: 'single',
    content: docOf(p('模型在训练集上表现很好，但在测试集上误差很大，这叫？')),
    options: ['欠拟合', '过拟合', '收敛', '数据增强'], answer: [1],
    explanation: docOf(p('"死记硬背"了训练集 —— 对策：更多数据、正则化、简化模型。')) },
  /* ===== N15 KNN 与决策树 ===== */
  { key: 'NQ29', type: 'single',
    content: docOf(p('KNN 中 K 取得太小，会导致？')),
    options: ['决策边界太平滑', '对噪声敏感、容易过拟合', '训练速度变快', '不需要算距离'], answer: [1] },
  { key: 'NQ30', type: 'judge',
    content: docOf(p('KNN 的 K 一般取奇数，避免投票时出现平票。')),
    options: JUDGE, answer: CORRECT },
  /* ===== N16 线性回归与梯度下降 ===== */
  { key: 'NQ31', type: 'fill',
    content: docOf(p('梯度下降：当前 w=2，梯度=0.5，学习率 η=0.1，则新 w = 2 − 0.1×0.5 = ', inputNode('1.95'), '。')),
    options: [''], answer: ['1.95'] },
  { key: 'NQ32', type: 'single',
    content: docOf(p('梯度下降的学习率设置过大会发生什么？')),
    options: ['收敛更快且更稳', '来回震荡甚至发散', '损失函数消失', '自动变成 Adam'], answer: [1] },
  /* ===== N17 神经网络与 Softmax ===== */
  { key: 'NQ33', type: 'single',
    content: docOf(p('对输出 [2.0, 1.0, 1.0] 做 softmax（2025 真题），最大一类的概率约为？')),
    options: ['0.576', '0.509', '0.516', '0.500'], answer: [0],
    explanation: docOf(p('e²≈7.39，总和≈12.83，7.39/12.83≈0.576。')) },
  { key: 'NQ34', type: 'fill',
    content: docOf(p('激活函数 ReLU 的定义：负数归零。则 ReLU(−3) = ', inputNode('0'), '。')),
    options: [''], answer: ['0'] },
  /* ===== N18 CNN ===== */
  { key: 'NQ35', type: 'fill',
    content: docOf(p('输入 32×32，卷积核 5×5，无填充、步长 1，输出尺寸 = (32−5)/1+1 = ', inputNode('28'), '×28。')),
    options: [''], answer: ['28'] },
  { key: 'NQ36', type: 'sort',
    content: docOf(p('🖼️ 把 CNN 的典型结构按顺序排列：')),
    options: ['卷积层提取特征', 'ReLU 激活', '池化层压缩', '全连接层 + softmax 分类'],
    answer: sortAns(4) },
  /* ===== N19 NLP ===== */
  { key: 'NQ37', type: 'single',
    content: docOf(p('词嵌入（Word Embedding）最重要的性质是？')),
    options: ['每个词的向量长度等于词典大小', '语义相近的词，向量距离也相近', '向量只能是 0 和 1', '词向量不能做加减法'], answer: [1] },
  { key: 'NQ38', type: 'fill',
    content: docOf(p('经典词向量类比：国王 − 男 + 女 ≈ ', inputNode('女王'), '。')),
    options: [''], answer: ['女王'] },
  /* ===== N20 伦理 ===== */
  { key: 'NQ39', type: 'single',
    content: docOf(p('（2025 真题）银行希望贷款模型兼顾高准确率与可解释性，最合适的措施是？')),
    options: ['公开模型权重和所有客户数据', '采用可解释性技术（如特征重要度分析）揭示判断逻辑', '随机生成拒贷理由', '把模型简化到只剩一个特征'], answer: [1] },
  { key: 'NQ40', type: 'multiple',
    content: docOf(p('以下哪些是应对算法偏见的有效措施？')),
    options: ['使用多样化的训练数据', '定期做公平性审计', '假装问题不存在', '只优化整体准确率'], answer: [0, 1] },
  /* ===== N21 sklearn ===== */
  { key: 'NQ41', type: 'sort',
    content: docOf(p('🧪 把 sklearn 建模流程排好序：')),
    options: ['train_test_split 划分数据', 'StandardScaler 归一化', 'model.fit 训练', 'predict + accuracy_score 评估'],
    answer: sortAns(4) },
  { key: 'NQ42', type: 'judge',
    content: docOf(p('在 sklearn 中，测试集也应该调用 fit_transform 来做归一化。')),
    options: JUDGE, answer: WRONG,
    explanation: docOf(p('测试集只能 transform —— 用训练集学到的均值方差，否则就是数据泄漏。')) },
  /* ===== N22 PyTorch ===== */
  { key: 'NQ43', type: 'sort',
    content: docOf(p('🔥 把 PyTorch 训练循环的五步排好序：')),
    options: ['前向传播 pred = model(X)', '计算损失 loss_fn(pred, y)', 'optimizer.zero_grad() 清空梯度', 'loss.backward() 反向传播', 'optimizer.step() 更新参数'],
    answer: sortAns(5) },
  { key: 'NQ44', type: 'single',
    content: docOf(p('PyTorch 中多分类任务常用的损失函数是？')),
    options: ['MSELoss', 'CrossEntropyLoss', 'L1Loss', 'BCEWithLogitsLoss（二分类专用）'], answer: [1] },
  /* ===== N23 真题与策略 ===== */
  { key: 'NQ45', type: 'single',
    content: docOf(p('NOAI 中国站上机赛，最稳妥的开局策略是？')),
    options: ['直接上最复杂的模型', '先跑通 baseline，固定 random_state，再逐步调优', '手写全部底层算法', '等队友先做'], answer: [1] },
  { key: 'NQ46', type: 'fill',
    content: docOf(p('实验要可复现，就要固定随机种子：在 sklearn 中设置 ', inputNode('random_state'), ' 参数。')),
    options: [''], answer: ['random_state'] },
  /* ===== Group overview questions ===== */
  { key: 'GQ1', type: 'single',
    content: docOf(p('NOAI 中国站选拔出的选手将代表中国参加哪个国际赛事？')),
    options: ['IOI 国际信息学奥赛', 'IOAI 国际人工智能奥林匹克', 'IMO 国际数学奥赛', 'ICPC 程序设计竞赛'], answer: [1] },
  { key: 'GQ2', type: 'judge',
    content: docOf(p('NOAI 水平测试是纸笔考，不能上机 —— 平时要刻意练习"手写代码、心中运行"。')),
    options: JUDGE, answer: CORRECT },
  { key: 'GQ3', type: 'single',
    content: docOf(p('Python 的 dict 和 set 底层实现的数据结构是？')),
    options: ['链表', '哈希表', '二叉树', '图'], answer: [1] },
  { key: 'GQ4', type: 'single',
    content: docOf(p('概念解释题（20 分）的推荐答题结构是？')),
    options: ['只写定义', '定义 + 具体例子（+ 一句应用）', '只举例', '画一张图不写字'], answer: [1] },
  { key: 'GQ5', type: 'judge',
    content: docOf(p('softmax 输出各分量的和恒为 1，因此可以当作概率来读。')),
    options: JUDGE, answer: CORRECT },
  { key: 'GQ6', type: 'single',
    content: docOf(p('NOAI 中国站上机赛中，参赛者被允许做什么？')),
    options: ['上网抄答案', '查框架的官方文档解决问题', '互相讨论', '让场外教练代写'], answer: [1],
    explanation: docOf(p('IOAI 的核心能力要求之一：能在官方文档帮助下使用 sklearn / PyTorch 解决真实问题。')) },
]

/* ---------- 章节定义 ---------- */
const CHAPTERS = [
  { key: 'G01', name: '认识 NOAI', group: true },
  { key: 'N01', name: 'NOAI 是什么？' },
  { key: 'N02', name: '考纲拆解与备考路线' },
  { key: 'N03', name: 'AI 发展史与三大学派' },
  { key: 'G02', name: 'Python 编程基础', group: true },
  { key: 'N04', name: 'Python 语法速览' },
  { key: 'N05', name: '函数与常用模块' },
  { key: 'N06', name: '列表与字典进阶' },
  { key: 'N07', name: '字符串与文件' },
  { key: 'G03', name: '基础数据结构', group: true },
  { key: 'N08', name: '栈、队列与链表' },
  { key: 'N09', name: '哈希表' },
  { key: 'N10', name: '树与图、BFS 与 DFS' },
  { key: 'N11', name: '排序与查找' },
  { key: 'G04', name: '人工智能基本概念', group: true },
  { key: 'N12', name: '什么是机器学习？' },
  { key: 'N13', name: '数据与特征工程' },
  { key: 'N14', name: '模型评估：混淆矩阵' },
  { key: 'N15', name: 'KNN 与决策树' },
  { key: 'G05', name: 'AI 基本算法', group: true },
  { key: 'N16', name: '线性回归与梯度下降' },
  { key: 'N17', name: '神经网络与 Softmax' },
  { key: 'N18', name: 'CNN 卷积神经网络' },
  { key: 'N19', name: '自然语言处理基础' },
  { key: 'N20', name: 'AI 伦理与安全' },
  { key: 'G06', name: '面向中国站：工具与实战', group: true },
  { key: 'N21', name: 'scikit-learn 实战' },
  { key: 'N22', name: 'PyTorch 入门' },
  { key: 'N23', name: '真题拆解与应试策略' },
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
    const body = { course_id: COURSE_ID, name: `NOAI ${key}`, type: q.type, point: 5, tags: ['noai'] }
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
      '## 🏆 NOAI 备考课程',
      '',
      '对标 **NOAI（全国人工智能奥林匹克）最新大纲**的完整备考课程 —— IOAI 国际人工智能奥林匹克的的中国区选拔通道。',
      '',
      '- 🎯 **考什么就学什么**：水平测试三大板块（Python 编程基础 · 基础数据结构 · AI 基本概念与算法）逐章覆盖',
      '- 🧮 **真题考法全程嵌入**：softmax 手算、混淆矩阵、卷积尺寸、梯度下降更新 …… 每章配练习',
      '- 🚀 **进阶中国站**：scikit-learn 与 PyTorch 实战、2024–2025 真题拆解与应试策略',
      '- ✍️ **纸笔考特训**：手写代码、心中 trace，全程按考试形式训练',
      '',
      ':::callout icon=💡',
      '全程中文。概念解释题（20 分）贯穿课程 —— 每个术语都按「定义 + 例子 + 应用」三段式练。',
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
