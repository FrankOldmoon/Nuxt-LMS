/**
 * 构建 CCC 教程（course 7, chapter 14）写入 aics.oldmoon.cn
 *
 * 流程：
 *  1. 登录拿 token
 *  2. 删除链路测试题（courseId 7, cid 1）
 *  3. 幂等创建 19 道语法/题型题 + 7 道 OJ 实战题（checkpoint: storage/oj_problems/qcids.json）
 *  4. 生成真题索引表（storage/oj_problems/details.json）
 *  5. 保存章节（markdown 通道，%%Q%% 标记占位）→ 取回 doc JSON → 替换标记为 vue 节点 → 结构自检 → 最终保存
 *
 * 用法：node scripts/build_ccc_chapter.cjs
 */
const fs = require('fs')
const path = require('path')

const BASE = 'https://aics.oldmoon.cn'
const COURSE_ID = 7
const CHAPTER_ID = 14
const OUT_DIR = path.join(__dirname, '..', 'storage', 'oj_problems')
const CHECKPOINT = path.join(OUT_DIR, 'qcids.json')
const MD_FILE = path.join(__dirname, 'ccc_tutorial.md')

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
const codeBlock = (language, ...lines) => ({ type: 'codeBlock', attrs: { language }, content: [t(lines.join('\n'))] })
const docOf = (...blocks) => ({ type: 'doc', content: blocks })
const inputNode = (ans) => ({ type: 'inputs', attrs: { content: ans } })
const selectNode = (ans) => ({ type: 'select', attrs: { content: ans } })

/** skills/03 自检规则 ①②③④ */
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
const JUDGE = ['Correct', 'Wrong']
const QUESTIONS = [
  { key: 'Q1', name: 'CCC 竞赛常识 · 赛制', type: 'judge',
    content: docOf(p('CCC 竞赛由滑铁卢大学主办；Junior 和 Senior 是两份不同的试卷，报名时可以任选一份参加。')),
    options: JUDGE, answer: [0] },
  { key: 'Q2', name: 'CCC 竞赛常识 · 部分分', type: 'judge',
    content: docOf(p('每道题按通过的测试点（subtask）给部分分，所以即使想不出完整算法，也应该把简单情况的写法交上去。')),
    options: JUDGE, answer: [0] },
  { key: 'Q3', name: '语法 · input 的返回类型', type: 'fill',
    content: docOf(p('input() 读进来的内容永远是', inputNode('字符串'), '类型，要做数学运算必须先用 int() 转换。')),
    options: [''], answer: ['字符串'] },
  { key: 'Q4', name: '语法 · input 的坑', type: 'single',
    content: docOf(p('运行下面的代码并输入 3，会发生什么？'), codeBlock('python', 'x = input()', 'print(x + 1)')),
    options: ['输出 4', '输出 31', '程序报错：字符串不能和整数相加', '输出 x + 1'], answer: [2],
    explanation: docOf(p('input() 返回字符串 "3"，"3" + 1 类型不同直接报错；要写 x = int(input())。')) },
  { key: 'Q5', name: '语法 · 条件判断', type: 'single',
    content: docOf(p('运行上面的超速判断代码，输入限速 40 和车速 75，输出什么？')),
    options: ['100', '500', 'Congratulations, you are within the speed limit!', '程序报错'], answer: [1],
    explanation: docOf(p('over = 75 - 40 = 35 > 30，进入 else 分支输出 500。')) },
  { key: 'Q6', name: '语法 · for 循环', type: 'select',
    content: docOf(p('想让一段代码重复执行 10 次，最合适的写法是：', selectNode('for i in range(10):'))),
    options: ['for i in range(10):', 'while 10:', 'repeat(10):', 'for i until 10:'], answer: ['for i in range(10):'] },
  { key: 'Q7', name: '语法 · 字符串表达式', type: 'multiple',
    content: docOf(p('下列表达式的值等于 3 的有哪些？')),
    options: ['`len("abc")`', '`len("ab")`', '`len("a,b,c".split(","))`', '`"abc".upper()`'], answer: [0, 2],
    explanation: docOf(p('len("abc") = 3；"a,b,c".split(",") 得到 ["a","b","c"]，长度 3。其余分别为 2 和 "ABC"。')) },
  { key: 'Q8', name: '语法 · 排序', type: 'fill',
    content: docOf(p('有成绩列表 ', code('scores = [80, 95, 70]'), '，调用 ', code('scores.'), inputNode('sort'), code('()'), ' 可以让它从小到大排序。')),
    options: [''], answer: ['sort'] },
  { key: 'Q9', name: '题型 1 · J1–J2 特点', type: 'single',
    content: docOf(p('J1、J2 这类题的共同特点是？')),
    options: ['读懂题意 + 按题意计算就能做对，重点是细心', '必须用 BFS 搜索', '必须用递归', '需要高级数据结构'], answer: [0] },
  { key: 'Q10', name: '题型 2 · 字符串写法', type: 'multiple',
    content: docOf(p('下列 Python 写法正确的有哪些？')),
    options: ['`len(s)` 返回字符串长度', '`s[::-1]` 得到倒序字符串', '`s + 1` 把字符串和数字直接相加', "`'*' * 5` 得到 `'*****'`"],
    answer: [0, 1, 3], explanation: docOf(p('字符串不能直接和数字相加，要用 str() 转换或 f-string。')) },
  { key: 'Q11', name: '题型 3 · 枚举思想', type: 'judge',
    content: docOf(p('From 1987 to 2013 这类题，从 Y+1 开始一年一年往后试——方法虽然「笨」，但只要数据范围小，它就是正确且可靠的做法。')),
    options: JUDGE, answer: [0] },
  { key: 'Q12', name: '题型 4 · 字典记账', type: 'judge',
    content: docOf(p('Wait Time 这类时间线模拟题，适合用一个字典记录每个朋友的「等待起点时刻」，在 S 事件时结算等待时长。')),
    options: JUDGE, answer: [0] },
  { key: 'Q13', name: '题型 5 · Sunflowers 恢复行序', type: 'single',
    content: docOf(p('CCC18J4 中孩子的照片可能打乱了行顺序。恢复正确行序的方法是？')),
    options: ['按第一列（第一天身高）从小到大重新排列各行', '按最后一行排序', '把表格行列互换', '把所有数字减 1'], answer: [0] },
  { key: 'Q19', name: '题型 5 · 网格读入', type: 'single',
    content: docOf(p('读入 R 行、每行一个字符串的网格，最简洁的写法是？')),
    options: ['`grid = [input() for _ in range(R)]`', '`grid = input(R)`', '`grid = [input()] * R`', '`read(R, grid)`'], answer: [0],
    explanation: docOf(p('列表推导式逐行调用 input()，共 R 次，得到 R 个字符串组成的列表。')) },
  { key: 'Q14', name: '题型 6 · BFS 数据结构', type: 'select',
    content: docOf(p('BFS（广度优先搜索）的核心数据结构是：', selectNode('队列 Queue'))),
    options: ['栈 Stack', '队列 Queue', '堆 Heap', '链表'], answer: ['队列 Queue'] },
  { key: 'Q15', name: '题型 6 · visited 的作用', type: 'fill',
    content: docOf(p('BFS 模板中，visited（访问标记）集合的作用是避免', inputNode('重复'), '访问同一个格子。')),
    options: [''], answer: ['重复'] },
  { key: 'Q16', name: '题型 6 · 最少步数', type: 'single',
    content: docOf(p('Knight Hop 求骑士从起点到终点的最少步数，最适合的算法是？')),
    options: ['BFS（广度优先搜索）', 'DFS（深度优先搜索）', '贪心', '快速排序'], answer: [0],
    explanation: docOf(p('BFS 按层扩展，第一次到达终点时的步数就是最短步数。')) },
  { key: 'Q17', name: '题型 7 · 递归要点', type: 'judge',
    content: docOf(p('每个递归函数都必须有结束条件（递归出口），否则会无限递归下去直到程序崩溃。')),
    options: JUDGE, answer: [0] },
  { key: 'Q18', name: 'S 组 · 贪心配对', type: 'single',
    content: docOf(p('Tandem Bicycle 中当 d=1（求总速度最大）时，正确的配对策略是？')),
    options: ['一边升序、另一边降序后一对一配对', '两边都升序后配对', '两边都降序后配对', '随机配对'], answer: [0],
    explanation: docOf(p('升序配降序 → 每一对的 max 都是较大的那一方，总速度最大。')) },
]

const OJ_QUESTIONS = [
  { key: 'O1', pid: 'CCC24J1', name: '🧪 OJ 实战：CCC24J1 Conveyor Belt Sushi' },
  { key: 'O2', pid: 'CCC19J2', name: '🧪 OJ 实战：CCC19J2 Time to Decompress' },
  { key: 'O3', pid: 'CCC13J3', name: '🧪 OJ 实战：CCC13J3 From 1987 to 2013' },
  { key: 'O4', pid: 'CCC15J4', name: '🧪 OJ 实战：CCC15J4 Wait Time' },
  { key: 'O5', pid: 'CCC18J4', name: '🧪 OJ 实战：CCC18J4 Sunflowers' },
  { key: 'O6', pid: 'CCC10J5', name: '🧪 OJ 实战：CCC10J5 Knight Hop' },
  { key: 'O7', pid: 'CCC21J4', name: '🧪 OJ 实战：CCC21J4 Arranging Books' },
]

/* ---------- 真题索引表 ---------- */
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
  const link = (pid) => `[${pid}](http://oj.oldmoon.cn/p/${pid})`
  let md = '| 年份 | 🥉 初级 J1–J5 | 🥇 高级 S1–S5 |\n| --- | --- | --- |\n'
  for (const y of years) {
    const j = byYear[y].J.map(link).join(' ')
    const s = byYear[y].S.map(link).join(' ')
    md += `| 20${y} | ${j} | ${s} |\n`
  }
  return md
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

  // 2. 清理链路测试题
  await api('/api/questions/batch', 'POST', { rows: [{ courseId: COURSE_ID, cid: 1 }], action: 'remove' })
  console.log('测试题 cid=1 已清除')

  // 3. 幂等建题
  const qmap = fs.existsSync(CHECKPOINT) ? JSON.parse(fs.readFileSync(CHECKPOINT, 'utf8')) : {}
  const all = [...QUESTIONS, ...OJ_QUESTIONS.map((o) => ({ ...o, type: 'oj' }))]
  for (const q of all) {
    if (qmap[q.key]) { console.log(`${q.key} 已存在 cid=${qmap[q.key]}，跳过`); continue }
    const body = { course_id: COURSE_ID, name: q.name, type: q.type, point: 1, tags: ['ccc7'] }
    if (q.type === 'oj') {
      body.content = q.pid
      body.options = { pid: q.pid }
      body.answer = []
    } else {
      body.content = q.content
      body.options = q.options
      body.answer = q.answer
      if (q.explanation) body.explanation = q.explanation
      // 题目结构自检（skill 规则 ①④⑤）
      const issues = validateContent(q.content)
      if (issues.length) throw new Error(`${q.key} 题目结构问题: ${issues.join('; ')}`)
      const s = JSON.stringify(q.content)
      if (q.type === 'fill' && !s.includes('"inputs"')) throw new Error(`${q.key} fill 缺 inputs 节点`)
      if (q.type === 'select' && !s.includes('"select"')) throw new Error(`${q.key} select 缺 select 节点`)
    }
    const created = await api('/api/questions/add', 'POST', body)
    qmap[q.key] = created.cid
    console.log(`${q.key} 建题 OK cid=${created.cid} (${q.name})`)
    fs.writeFileSync(CHECKPOINT, JSON.stringify(qmap, null, 2))
  }

  // 4. 组装 markdown
  let md = fs.readFileSync(MD_FILE, 'utf8')
  md = md.replace('%%INDEX_TABLE%%', buildIndexTable())

  // 5. 第一次保存（markdown 通道）
  await api('/api/chapters/update', 'POST', {
    id: CHAPTER_ID,
    title: '🍁 CCC 备赛教程：语法 + 七大题型 + 十七年真题',
    content: md,
  })
  console.log('章节 markdown 已保存，开始标记替换...')

  // 6. 取回 doc JSON，把 %%X%% 标记段落替换为 vue 题目节点
  const chRaw = await api(`/api/chapters/show?id=${CHAPTER_ID}`)
  const ch = chRaw.chapter || chRaw
  const doc = ch.content
  let replaced = 0
  const walk = (nodes) => {
    for (let i = 0; i < nodes.length; i++) {
      const n = nodes[i]
      if (n.type === 'paragraph') {
        const text = (n.content || []).map((c) => c.text || '').join('').trim()
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
  if (replaced !== Object.keys(qmap).length) {
    console.warn(`⚠️ 标记替换数 ${replaced} ≠ 题目数 ${Object.keys(qmap).length}，检查被吞的标记`)
  }

  // 7. 结构自检 + 最终保存
  const issues = validateContent(doc)
  if (issues.length) {
    fs.writeFileSync(path.join(OUT_DIR, 'ccc_doc_invalid.json'), JSON.stringify(doc, null, 2))
    throw new Error('章节结构自检失败:\n' + issues.join('\n'))
  }
  await api('/api/chapters/update', 'POST', { id: CHAPTER_ID, content: doc })
  console.log(`✅ 最终保存完成：替换 ${replaced} 个题目标记，结构自检通过`)
  console.log('题目 cid 映射:', JSON.stringify(qmap))
})().catch((e) => {
  console.error('❌ 失败:', e.message)
  process.exit(1)
})
