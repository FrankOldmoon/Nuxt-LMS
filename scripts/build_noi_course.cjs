/**
 * 构建 NOI 备考课程（course 21）写入 aics.oldmoon.cn
 *
 * 大纲：CCF《NOI 系列竞赛大纲（2025 年修订版）》— 入门级（CSP-J，难度1-5）/ 提高级（CSP-S/NOIP，5-8）/ NOI 级
 * 结构：7 个分组（group）+ 30 个子章节，中文，每章 2 道配套练习
 * 流程（复用 build_noai_course.cjs 模式，含 currentGroup 修复）：
 *  1. 登录 → 2. 幂等建题（checkpoint: storage/oj_problems/noi_qcids.json）
 *  3. 解析 scripts/noi_tutorial.md（%%%%% 分节），创建缺失章节（复用 id 706 作 "NOI 系列竞赛与晋级路线"）
 *  4. orders 目录树 + 课程简介 → 5. 逐章 markdown → 替换标记 → 自检 → 回存
 *
 * 用法：node scripts/build_noi_course.cjs
 */
const fs = require('fs')
const path = require('path')

const BASE = 'https://aics.oldmoon.cn'
const COURSE_ID = 21
const REUSE = { O01: 706 } // "NOI 系列竞赛与晋级路线" 复用已有章节 706
const OUT_DIR = path.join(__dirname, '..', 'storage', 'oj_problems')
const CHECKPOINT = path.join(OUT_DIR, 'noi_qcids.json')
const MD_FILE = path.join(__dirname, 'noi_tutorial.md')

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
  /* ===== O01 晋级路线 ===== */
  { key: 'O01A', type: 'judge',
    content: docOf(p('CSP-J 对应大纲的"入门级"，CSP-S 和 NOIP 对应"提高级"。')),
    options: JUDGE, answer: CORRECT },
  { key: 'O01B', type: 'sort',
    content: docOf(p('🪜 把 NOI 晋级路线按顺序排列：')),
    options: ['CSP-J/S 第一轮', 'CSP-J/S 第二轮（机试）', 'NOIP 联赛', '省选', 'NOI 决赛'],
    answer: sortAns(5) },
  /* ===== O02 环境与评测 ===== */
  { key: 'O02A', type: 'single',
    content: docOf(p('估算复杂度：简单运算 1 秒大约能执行多少次？')),
    options: ['10⁴', '10⁶', '10⁸', '10¹²'], answer: [2] },
  { key: 'O02B', type: 'multiple',
    content: docOf(p('以下哪些是竞赛机试的好习惯？')),
    options: ['拿到题先看数据范围再定算法', '写不出正解先交暴力拿部分分', '提交前确认文件已保存', '凭感觉不开 long long'], answer: [0, 1, 2] },
  /* ===== O03 复杂度 ===== */
  { key: 'O03A', type: 'single',
    content: docOf(p('n = 3000，O(n³) 的算法约执行 2.7×10¹⁰ 次，1 秒内跑得完吗？')),
    options: ['轻松跑完', '必须优化到 O(n²) 以下才可能', '复杂度和运行时间无关', '正好 1 秒'], answer: [1] },
  { key: 'O03B', type: 'fill',
    content: docOf(p('二分查找 10⁶ 个有序数据，最多约 ', inputNode('20'), ' 次比较。')),
    options: [''], answer: ['20'] },
  /* ===== C01 基础语法 ===== */
  { key: 'C01A', type: 'single',
    content: docOf(p('n 最大 10⁵，要计算两个变量的乘积（最大可能 10⁵ × 10⁵），应该用什么类型？')),
    options: ['int', 'short', 'long long', 'char'], answer: [2],
    explanation: docOf(p('10¹⁰ 超过 int 上限（约 2.1×10⁹），必须用 long long。')) },
  { key: 'C01B', type: 'judge',
    content: docOf(p('竞赛 C++ 中在大数据量时，通常在 main 开头加 ios::sync_with_stdio(false) 加速 cin/cout。')),
    options: JUDGE, answer: CORRECT },
  /* ===== C02 数组字符串结构体 ===== */
  { key: 'C02A', type: 'single',
    content: docOf(p('数组 a[100005] 读入 n ≤ 10⁵ 个数，如果下标写成了 a[n]，会发生什么？')),
    options: ['自动取最后一个元素', '数组越界——未定义行为，可能 RE 或输出错误答案', '编译错误', '自动扩容'], answer: [1] },
  { key: 'C02B', type: 'fill',
    content: docOf(p('string s 的长度可以用 s.', inputNode('size'), '() 获取。')),
    options: [''], answer: ['size'] },
  /* ===== C03 函数与递归 ===== */
  { key: 'C03A', type: 'sort',
    content: docOf(p('🔁 递归函数的三要素按逻辑顺序排列：')),
    options: ['明确函数功能', '写终止条件（最小问题直接给答案）', '写递归调用（大问题变小问题）'],
    answer: sortAns(3) },
  { key: 'C03B', type: 'judge',
    content: docOf(p('递归深度过大（如 n = 10⁵ 的裸递归）可能导致爆栈（RE），应改写成递推。')),
    options: JUDGE, answer: CORRECT },
  /* ===== C04 STL 入门 ===== */
  { key: 'C04A', type: 'select',
    content: docOf(p('对 vector v 升序排序，正确的写法是 ', selectNode('sort(v.begin(), v.end())'))),
    options: ['sort(v.begin(), v.end())', 'sort(v)', 'v.sort()', 'order(v.begin(), v.end())'], answer: ['sort(v.begin(), v.end())'] },
  { key: 'C04B', type: 'single',
    content: docOf(p('vector::push_back 的均摊时间复杂度是？')),
    options: ['O(1)', 'O(log n)', 'O(n)', 'O(n log n)'], answer: [0] },
  /* ===== C05 STL 进阶 ===== */
  { key: 'C05A', type: 'match',
    content: docOf(p('🧰 把 STL 容器与其特点匹配：')),
    options: [
      { left: 'set', right: '自动排序 + 去重' },
      { left: 'map', right: '键值对映射' },
      { left: 'priority_queue', right: '堆顶取最值' },
      { left: 'deque', right: '两端都能进出' }],
    answer: matchAns(4) },
  { key: 'C05B', type: 'single',
    content: docOf(p('STL 中需要"反复取当前最小值"（如 Dijkstra、合并果子），应该用？')),
    options: ['stack', 'set 的小根堆版', 'priority_queue<int, vector<int>, greater<int>>', 'queue'], answer: [2] },
  /* ===== A01 枚举与模拟 ===== */
  { key: 'A01A', type: 'single',
    content: docOf(p('n = 10⁵，两两枚举所有数对（O(n²)）可行吗？')),
    options: ['可行，很快', '不可行，约 10¹⁰ 次运算必须优化', '和 n 无关', '只要内存够就行'], answer: [1] },
  { key: 'A01B', type: 'judge',
    content: docOf(p('模拟题最大的失分点通常是边界情况（第一天/最后一天、端点等）。')),
    options: JUDGE, answer: CORRECT },
  /* ===== A02 排序 ===== */
  { key: 'A02A', type: 'classify',
    content: docOf(p('🔄 把排序算法按稳定性分类：')),
    options: [
      { name: '稳定 ✅', items: ['冒泡排序', '归并排序'] },
      { name: '不稳定 ❌', items: ['快速排序', '堆排序'] }],
    answer: [0, 0, 1, 1] },
  { key: 'A02B', type: 'single',
    content: docOf(p('值域只有 0~1000 的 10⁶ 个整数排序，最优选择是？')),
    options: ['冒泡排序', '快速排序', '计数排序 O(n + k)', '必须归并'], answer: [2] },
  /* ===== A03 贪心 ===== */
  { key: 'A03A', type: 'single',
    content: docOf(p('活动安排问题（选最多不重叠区间）的正确贪心策略是？')),
    options: ['按开始时间从早到晚选', '按结束时间从早到晚选', '按活动时长从短到长选', '随便选'], answer: [1],
    explanation: docOf(p('结束越早，给后面留的空间越大 —— 按右端点排序是经典套路。')) },
  { key: 'A03B', type: 'judge',
    content: docOf(p('贪心算法不需要证明/验证就直接使用是危险的——有些问题贪心会得到错误答案。')),
    options: JUDGE, answer: CORRECT },
  /* ===== A04 二分 ===== */
  { key: 'A04A', type: 'sort',
    content: docOf(p('🔬 二分答案的步骤排序：')),
    options: ['确定答案区间 [lo, hi]', '取中点 mid 并 check(mid) 是否可行', '根据可行性收缩区间', '区间为空时得到答案'],
    answer: sortAns(4) },
  { key: 'A04B', type: 'fill',
    content: docOf(p('题目要求"最小值最大"，第一反应应该想到 ', inputNode('二分'), '答案。')),
    options: [''], answer: ['二分'] },
  /* ===== A05 前缀和与差分 ===== */
  { key: 'A05A', type: 'fill',
    content: docOf(p('前缀和查询：a[l..r] 的和 = S[r] − S[', inputNode('l-1'), ']。')),
    options: [''], answer: ['l-1'] },
  { key: 'A05B', type: 'single',
    content: docOf(p('需要对 10⁵ 段区间整体 +1，最后查询全数组，最优工具是？')),
    options: ['每段暴力加（O(n²)）', '差分数组：d[l]++, d[r+1]--，最后前缀和还原', '堆', '并查集'], answer: [1] },
  /* ===== A06 分治与倍增 ===== */
  { key: 'A06A', type: 'single',
    content: docOf(p('归并排序求逆序对，利用的是合并两个有序段时的什么性质？')),
    options: ['右侧元素小于左侧时，它小于左侧剩余的全部元素', '排序后逆序对消失', '递归深度是 log n', '归并是稳定排序'], answer: [0] },
  { key: 'A06B', type: 'single',
    content: docOf(p('快速幂 qpow(a, b) 利用 b 的什么表示把复杂度降到 O(log b)？')),
    options: ['质因数分解', '二进制表示', '阶乘表示', '因数个数'], answer: [1] },
  /* ===== S01 DFS 与回溯 ===== */
  { key: 'S01A', type: 'sort',
    content: docOf(p('🌲 回溯的三步曲排序：')),
    options: ['做出选择', '递归进入下一层', '撤销选择（恢复现场）'],
    answer: sortAns(3) },
  { key: 'S01B', type: 'judge',
    content: docOf(p('"当前部分解已劣于已知最优解就立即返回"属于最优性剪枝。')),
    options: JUDGE, answer: CORRECT },
  /* ===== S02 BFS ===== */
  { key: 'S02A', type: 'single',
    content: docOf(p('无权图求单源最短路（最少步数），应该用？')),
    options: ['DFS', 'BFS', '并查集', '贪心'], answer: [1] },
  { key: 'S02B', type: 'fill',
    content: docOf(p('BFS 中 vis 标记必须在节点 ', inputNode('入队'), ' 时打，否则同一格会被重复加入队列。')),
    options: [''], answer: ['入队'] },
  /* ===== S03 一维 DP ===== */
  { key: 'S03A', type: 'fill',
    content: docOf(p('爬楼梯问题（一次跨 1 或 2 阶）的转移方程：f(n) = f(n−1) + ', inputNode('f(n-2)'), '。')),
    options: [''], answer: ['f(n-2)'] },
  { key: 'S03B', type: 'single',
    content: docOf(p('DP 三部曲的正确顺序是？')),
    options: ['转移 → 状态 → 初始化', '状态设计 → 状态转移 → 初始化与答案', '初始化 → 转移 → 状态', '随便写写'], answer: [1] },
  /* ===== S04 背包 ===== */
  { key: 'S04A', type: 'single',
    content: docOf(p('01 背包一维优化中，容量 j 必须**逆序**枚举，原因是？')),
    options: ['跑得更快', '保证每件物品最多被选一次', '省内存', '不影响结果'], answer: [1],
    explanation: docOf(p('正序会让 f[j - w[i]] 已经包含"本轮选过该物品"的状态，变成完全背包。')) },
  { key: 'S04B', type: 'classify',
    content: docOf(p('🎒 背包问题分类：')),
    options: [
      { name: '01 背包（最多一次）', items: ['每件物品只能选或不选', '纪念品每样限购一件'] },
      { name: '完全背包（无限件）', items: ['硬币可无限使用凑面值', '能量饮料随便喝'] }],
    answer: [0, 0, 1, 1] },
  /* ===== S05 高级 DP ===== */
  { key: 'S05A', type: 'single',
    content: docOf(p('区间 DP（如石子合并）应该按什么顺序枚举？')),
    options: ['按左端点从大到小', '按区间长度从小到大', '随机顺序', '按区间和'], answer: [1] },
  { key: 'S05B', type: 'judge',
    content: docOf(p('树形 DP 通常在后序遍历位置做转移——先算完所有子树，再更新父节点。')),
    options: JUDGE, answer: CORRECT },
  /* ===== D01 线性结构 ===== */
  { key: 'D01A', type: 'single',
    content: docOf(p('滑动窗口最大值问题的 O(n) 解法使用的数据结构是？')),
    options: ['优先队列（O(n log n)）', '单调队列（队头永远是窗口最值）', '并查集', '栈'], answer: [1] },
  { key: 'D01B', type: 'fill',
    content: docOf(p('判断括号串是否合法，用 ', inputNode('栈'), ' 逐字符处理：左括号入栈，右括号匹配弹栈。')),
    options: [''], answer: ['栈'] },
  /* ===== D02 并查集 ===== */
  { key: 'D02A', type: 'fill',
    content: docOf(p('并查集路径压缩：fa[x] = find(', inputNode('fa[x]'), ') —— 让每个节点直接指向祖先。')),
    options: [''], answer: ['fa[x]'] },
  { key: 'D02B', type: 'single',
    content: docOf(p('Kruskal 求最小生成树时，用并查集完成哪个判断？')),
    options: ['边的权值排序', '加入这条边是否会构成环（两点是否已连通）', '图是否有负权', '点的度数'], answer: [1] },
  /* ===== D03 堆与哈夫曼 ===== */
  { key: 'D03A', type: 'single',
    content: docOf(p('哈夫曼树的构造方法（合并果子）每次合并哪两堆？')),
    options: ['最大的两堆', '最小的两堆', '任意两堆', '奇数位置的两堆'], answer: [1] },
  { key: 'D03B', type: 'judge',
    content: docOf(p('STL 的 priority_queue 默认是大根堆，堆顶是最大元素。')),
    options: JUDGE, answer: CORRECT },
  /* ===== D04 树状数组与线段树 ===== */
  { key: 'D04A', type: 'fill',
    content: docOf(p('树状数组的核心：lowbit(x) = x & (', inputNode('-x'), ') —— 取 x 二进制最低位的 1。')),
    options: [''], answer: ['-x'] },
  { key: 'D04B', type: 'single',
    content: docOf(p('需要"区间修改 + 区间求最大值"，最合适的结构是？')),
    options: ['前缀和数组', '树状数组（裸版）', '线段树（带懒标记）', '优先队列'], answer: [2] },
  /* ===== D05 字符串算法 ===== */
  { key: 'D05A', type: 'single',
    content: docOf(p('KMP 算法中 next 数组的含义是？')),
    options: ['每个字符的出现次数', '每个前缀的"最长相等前后缀"长度，匹配失败时据此跳转', '字符串的哈希值', '字符串长度'], answer: [1] },
  { key: 'D05B', type: 'single',
    content: docOf(p('字符串哈希预处理后，判断任意两个子串是否相等的时间复杂度是？')),
    options: ['O(1)', 'O(log n)', 'O(子串长度)', 'O(n)'], answer: [0] },
  /* ===== T01 图存储与拓扑 ===== */
  { key: 'T01A', type: 'single',
    content: docOf(p('n 个点 m 条边的图，邻接表的空间复杂度是？')),
    options: ['O(n²)', 'O(n + m)', 'O(m²)', 'O(n log m)'], answer: [1] },
  { key: 'T01B', type: 'fill',
    content: docOf(p('拓扑排序（BFS 实现）每轮取出 ', inputNode('入度'), ' 为 0 的节点，并删除它的所有出边。')),
    options: [''], answer: ['入度'] },
  /* ===== T02 最短路 ===== */
  { key: 'T02A', type: 'match',
    content: docOf(p('🛣️ 把最短路算法与适用场景匹配：')),
    options: [
      { left: 'Dijkstra（堆优化）', right: '无负权边的单源最短路' },
      { left: 'SPFA / Bellman-Ford', right: '可以有负权边，还能判负环' },
      { left: 'Floyd', right: '多源最短路，O(n³)' }],
    answer: matchAns(3) },
  { key: 'T02B', type: 'judge',
    content: docOf(p('Dijkstra 算法可以正确处理带负权边的图。')),
    options: JUDGE, answer: WRONG,
    explanation: docOf(p('负权边会让"已确定的点"被更短路径更新，贪心前提失效 —— 用 SPFA。')) },
  /* ===== T03 MST 与二分图 ===== */
  { key: 'T03A', type: 'single',
    content: docOf(p('Kruskal 算法的核心步骤顺序是？')),
    options: ['边按权值排序 → 依次尝试加入 → 用并查集判断是否成环', '点排序 → 依次连边', '先 DFS 再连边', '随机加边直到连通'], answer: [0] },
  { key: 'T03B', type: 'judge',
    content: docOf(p('用 BFS 交替染色能判定二分图：染色过程不冲突就是二分图（无奇环）。')),
    options: JUDGE, answer: CORRECT },
  /* ===== M01 进制与位运算 ===== */
  { key: 'M01A', type: 'fill',
    content: docOf(p('二进制 1011₂ = ', inputNode('11'), '（十进制）。')),
    options: [''], answer: ['11'] },
  { key: 'M01B', type: 'single',
    content: docOf(p('判断整数 x 的奇偶，最优雅的写法是？')),
    options: ['x % 2 == 1', 'x & 1', 'x / 2 == 0', 'x >> 1'], answer: [1] },
  /* ===== M02 质数与快速幂 ===== */
  { key: 'M02A', type: 'fill',
    content: docOf(p('辗转相除法：gcd(12, 18) = ', inputNode('6'), '。')),
    options: [''], answer: ['6'] },
  { key: 'M02B', type: 'single',
    content: docOf(p('快速幂计算 a^b（取模）的时间复杂度是？')),
    options: ['O(b)', 'O(log b)', 'O(√b)', 'O(1)'], answer: [1] },
  /* ===== M03 组合数学与高精度 ===== */
  { key: 'M03A', type: 'single',
    content: docOf(p('从 5 个不同的球中选 2 个（不考虑顺序），共有多少种选法？')),
    options: ['10', '20', '25', '32'], answer: [0],
    explanation: docOf(p('C(5,2) = 5×4/2 = 10。')) },
  { key: 'M03B', type: 'judge',
    content: docOf(p('高精度加法用数组按位存储，低位在前，逐位相加并处理进位。')),
    options: JUDGE, answer: CORRECT },
  /* ===== Group overview questions ===== */
  { key: 'GA1', type: 'single',
    content: docOf(p('NOI 大纲（2025 修订版）中，CSP-J 对应哪个级别？')),
    options: ['入门级（难度 1–5）', '提高级（难度 5–8）', 'NOI 级（难度 8–10）', '没有对应'], answer: [0] },
  { key: 'GA2', type: 'judge',
    content: docOf(p('NOI 系列竞赛的指定语言是 C++。')),
    options: JUDGE, answer: CORRECT },
  { key: 'GA3', type: 'judge',
    content: docOf(p('前缀和与差分是入门级最高频考点之一：前缀和管静态区间查询，差分管批量区间修改。')),
    options: JUDGE, answer: CORRECT },
  { key: 'GA4', type: 'single',
    content: docOf(p('DP 三部曲中，最核心、最考验功力的一步是？')),
    options: ['状态设计', '写代码', '调格式', '提交'], answer: [0] },
  { key: 'GA5', type: 'single',
    content: docOf(p('树状数组、线段树属于大纲的哪个级别？')),
    options: ['入门级', '提高级', 'NOI 级专属', '大纲之外'], answer: [1] },
  { key: 'GA6', type: 'judge',
    content: docOf(p('图论题的关键是把实际问题翻译成"点 = 什么，边 = 什么，问的是哪个模型"。')),
    options: JUDGE, answer: CORRECT },
  { key: 'GA7', type: 'judge',
    content: docOf(p('位运算是竞赛的底层加速利器：x & 1 判奇偶、x >> 1 等于除以 2。')),
    options: JUDGE, answer: CORRECT },
]

/* ---------- 章节定义 ---------- */
const CHAPTERS = [
  { key: 'G01', name: '走进 NOI', group: true },
  { key: 'O01', name: 'NOI 系列竞赛与晋级路线' },
  { key: 'O02', name: '编程环境与评测机制' },
  { key: 'O03', name: '复杂度分析：1 秒的预算' },
  { key: 'G02', name: 'C++ 程序设计', group: true },
  { key: 'C01', name: 'C++ 基础语法' },
  { key: 'C02', name: '数组、字符串与结构体' },
  { key: 'C03', name: '函数、递归与引用' },
  { key: 'C04', name: 'STL 入门：vector、sort、pair' },
  { key: 'C05', name: 'STL 进阶：set、map、priority_queue' },
  { key: 'G03', name: '基础算法', group: true },
  { key: 'A01', name: '枚举与模拟' },
  { key: 'A02', name: '排序算法' },
  { key: 'A03', name: '贪心算法' },
  { key: 'A04', name: '二分查找与二分答案' },
  { key: 'A05', name: '前缀和与差分' },
  { key: 'A06', name: '分治与倍增' },
  { key: 'G04', name: '搜索与动态规划', group: true },
  { key: 'S01', name: 'DFS 深度优先搜索与回溯' },
  { key: 'S02', name: 'BFS 广度优先搜索' },
  { key: 'S03', name: '动态规划入门：一维 DP' },
  { key: 'S04', name: '背包 DP' },
  { key: 'S05', name: '区间 DP、树形 DP 与状压 DP' },
  { key: 'G05', name: '数据结构', group: true },
  { key: 'D01', name: '线性结构：栈、队列、链表、单调队列' },
  { key: 'D02', name: '并查集' },
  { key: 'D03', name: '堆与哈夫曼树' },
  { key: 'D04', name: '树状数组与线段树' },
  { key: 'D05', name: '字符串算法：KMP、哈希与 Trie' },
  { key: 'G06', name: '图论算法', group: true },
  { key: 'T01', name: '图的存储、遍历与拓扑排序' },
  { key: 'T02', name: '最短路：Dijkstra、SPFA 与 Floyd' },
  { key: 'T03', name: '最小生成树与二分图' },
  { key: 'G07', name: '数学基础', group: true },
  { key: 'M01', name: '进制转换与位运算' },
  { key: 'M02', name: '质数、GCD 与快速幂' },
  { key: 'M03', name: '组合数学与高精度' },
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
    const body = { course_id: COURSE_ID, name: `NOI ${key}`, type: q.type, point: 5, tags: ['noi'] }
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
      '## 🏁 NOI 备考课程',
      '',
      '对标 **CCF《NOI 系列竞赛大纲（2025 年修订版）》**的完整备考课程 —— 从 CSP-J 入门级一路覆盖到 CSP-S / NOIP 提高级核心考点。',
      '',
      '- 🗺️ **全局认知**：赛事晋级路线、NOI Linux 环境、部分分制与复杂度预算',
      '- 💻 **C++ 弹药库**：语法零失误 + STL 全家桶（vector / set / map / priority_queue）',
      '- ⚙️ **基础算法**：枚举、排序、贪心、二分、前缀和差分、分治倍增',
      '- 🎯 **搜索与 DP**：DFS 回溯、BFS、背包、区间/树形/状压 DP',
      '- 🏗️ **数据结构与图论**：并查集、堆、线段树、最短路、最小生成树',
      '- 🔢 **数学基础**：进制位运算、质数快速幂、组合数学',
      '',
      ':::callout icon=💡',
      '每章标注大纲难度系数起点，按章节顺序学习即是完整备考路线。**先暴力拿部分分，再优化拿满分** —— 这是 OI 选手的生存法则。',
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
