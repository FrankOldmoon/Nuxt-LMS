/**
 * 细化 OJ（地址取系统设置 oj.url）difficulty 分布（1-10 制）
 *
 * 策略：按 tag 签名（去掉 Beginner/Algorithms 前缀）分组，每组给一个难度区间 [lo,hi]，
 * 组内按 pid 顺序插值（越靠后越难），铺满 1-10。
 *
 * 区间设计：
 *   入门段 P1001-P1100：I/O→1，算术→1，条件→1-3，循环→2-3，列表→2-3，
 *     字符串→3-4，函数→3-4，二维列表→4，集合/元组→4，字典→4-5，
 *     栈/队列→5，递归→5-6
 *   算法段 P2001-P2100：模拟→4-5，排序→5-6，贪心→6-7，递推递归→6，
 *     二分→7，前缀和差分→7-8，搜索→8，线性DP→8-9，背包→9-10
 *
 * 用法：node scripts/oj_refine_difficulty.cjs <username> <password> [--dry]
 *
 * ─────────────────────────────────────────────────────────────────
 * ⚠️ Hydro OJ（系统设置 oj.url 所指向的平台）edit 接口踩坑大全（2026-09-09 实测）
 * ─────────────────────────────────────────────────────────────────
 * ① 必须登录会话
 *    POST /login 用 form 表单（uname/password），从 Set-Cookie 拿 sid。
 *    无会话时 POST /p/{pid}/edit 静默无效（返回 200/302 + 原 pdoc），不要被骗。
 *
 * ② edit POST 绝不能带 Accept: application/json（2026-09-09 下午新增的坑！）
 *    Hydro 的 JSON 响应器在 edit 路由上会崩 → 返回 500 且【不落库】。
 *    不带 Accept（或 Accept: text/html）时返回 302 → /p/{pid}，正常生效。
 *    注意：同一天上午带该头还能成功，下午就 500 了——疑似服务端重启后行为变化，
 *    所以这个头永远是隐患，POST 一律别带。
 *    GET 仍然必须带 Accept: application/json 才返回 JSON。
 *
 * ③ 请求体必须是 form-urlencoded
 *    new URLSearchParams({...}) 直接作为 body；JSON body 不会被解析。
 *
 * ④ tag 必须是逗号拼接的字符串
 *    传数组会 500 "value.replace is not a function"（服务端 parseCategory 崩）。
 *
 * ⑤ pid 必须出现在 edit payload 里，否则会被抹掉！
 *    Hydro 的 edit 会整体覆盖 pid 字段，payload 漏了 pid 题目就会从列表消失（404）。
 *    血的教训：P1001 曾因此消失，靠按 docId POST /p/2/edit 带上 pid=P1001 才救回。
 *    安全做法：pid + title + content + tag 四字段全部带上（即使只想改一个字段）。
 *
 * ⑥ 302 不代表写入成功，必须逐题回读验证
 *    api() 封装修改签名后，调用处若残留旧参数风格（如 api(url,'POST',null,{...})
 *    的 null 占位会吞掉表单），POST 发出去的是空 body——照样返回 302，但什么都没改。
 *    唯一可信的判断：POST 后立刻 GET /p/{pid} 回读，比对 difficulty/title/content/tag/pid。
 *
 * ⑦ P0 是保留题，跳过不动。
 *
 * ⑧ 改动前先备份（本脚本存 storage/oj_problems/oj155_difficulty_backup_v2.json），
 *    并先用第一题试改验证通过后再批量跑。
 */
const fs = require('fs')
const path = require('path')
const { getOjBase } = require('./lib/oj-config.cjs')

// OJ 平台基址来自系统设置（configs 表 lms:oj.url），不硬编码；启动时解析
let BASE = ''
const OUT_DIR = path.join(__dirname, '..', 'storage', 'oj_problems')
const BACKUP = path.join(OUT_DIR, 'oj155_difficulty_backup_v2.json')

// tag 签名 → 难度区间
const BANDS = {
  // ===== 入门段 =====
  'Input and Output': [1, 1],
  'Input and Output|Strings': [1, 1],
  'Math|Arithmetic Operations': [1, 1],
  'Math|Geometry': [1, 2],
  'Math': [2, 2],
  'Math|Sequences': [2, 2],
  'Conditionals|If': [1, 1],
  'Conditionals|If-Else': [1, 2],
  'Conditionals|Three-way Branch': [2, 2],
  'Conditionals|Multi-way Branch': [2, 2],
  'Conditionals|Logical Operators|and': [2, 2],
  'Conditionals|Logical Operators|or': [2, 2],
  'Conditionals|Logical Operators|not': [2, 2],
  'Conditionals|Nested Conditionals': [2, 3],
  'Loops|for': [2, 2],
  'Loops|while': [2, 3],
  'Lists|One per Line': [2, 2],
  'Lists|All in One Line': [2, 3],
  'Strings': [3, 4],
  '2D Lists': [4, 4],
  'Functions': [3, 4],
  'Sets': [4, 4],
  'Dictionaries': [4, 5],
  'Tuples': [4, 4],
  'Stacks': [5, 5],
  'Queues': [5, 5],
  'Recursion': [5, 6],
  // ===== 算法段 =====
  'Simulation': [4, 5],
  'Sorting': [5, 6],
  'Greedy': [6, 7],
  'Recurrence and Recursion': [6, 6],
  'Binary Search': [7, 7],
  'Prefix Sums and Difference Arrays': [7, 8],
  'Search': [8, 8],
  'Linear DP': [8, 9],
  'Knapsack': [9, 10],
}

const sigOf = (tags) => tags.filter((t) => t !== 'Beginner' && t !== 'Algorithms').join('|')

// 对按 pid 排序的连续同签名组做区间内插值
const interpolate = (group) => {
  const [lo, hi] = BANDS[group.sig]
  return group.items.map((p, i) => ({
    ...p,
    target: group.items.length === 1 ? lo : lo + Math.round((i / (group.items.length - 1)) * (hi - lo)),
  }))
}

let COOKIE = ''
async function api(p, method = 'GET', form) {
  // ⚠️ edit POST 不能带 Accept: application/json —— Hydro 的 JSON 响应器会 500 且不落库；
  // 不带 Accept（或 Accept: text/html）时返回 302 且正常生效
  const headers = method === 'GET' ? { Accept: 'application/json' } : {}
  if (COOKIE) headers.Cookie = COOKIE
  const res = await fetch(BASE + p, { method, headers, redirect: 'manual', body: form ? new URLSearchParams(form) : undefined })
  const sc = res.headers.getSetCookie ? res.headers.getSetCookie() : []
  if (sc.length) COOKIE = sc.map((c) => c.split(';')[0]).join('; ')
  const text = await res.text()
  try { return { status: res.status, json: JSON.parse(text) } } catch { return { status: res.status, text } }
}

;(async () => {
  BASE = await getOjBase()
  console.log(`OJ base: ${BASE}`)
  const dry = process.argv.includes('--dry')
  const args = process.argv.slice(2).filter((a) => !a.startsWith('--'))
  const [uname, password] = args

  // 1. 抓全部题目
  const problems = []
  for (let page = 1; page <= 3; page++) {
    const { json } = await api(`/p?page=${page}`)
    problems.push(...json.pdocs.map((d) => ({ pid: d.pid, difficulty: d.difficulty, tag: d.tag || [] })))
  }
  problems.sort((a, b) => a.pid.localeCompare(b.pid))

  // 2. 按 连续同签名 分组并插值定级（P0 保留原样）
  const groups = []
  let cur = null
  for (const p of problems) {
    if (p.pid === 'P0') continue
    const seg = p.pid.startsWith('P1') ? 'B' : 'A'
    const sig = sigOf(p.tag)
    if (!cur || cur.seg !== seg || cur.sig !== sig) {
      cur = { seg, sig, items: [] }
      groups.push(cur)
    }
    cur.items.push(p)
  }
  const unknown = groups.filter((g) => !BANDS[g.sig])
  if (unknown.length) throw new Error('未定义区间的签名: ' + unknown.map((g) => g.sig).join(', '))
  const targets = groups.flatMap(interpolate)

  // 3. 统计
  const dist = {}
  targets.forEach((p) => { dist[p.target] = (dist[p.target] || 0) + 1 })
  const changed = targets.filter((p) => p.difficulty !== p.target)
  console.log(`目标分布: ${JSON.stringify(dist)}`)
  console.log(`与当前不同: ${changed.length} 道`)
  if (dry) {
    fs.writeFileSync(path.join(OUT_DIR, 'oj155_difficulty_plan.json'), JSON.stringify(targets.map((p) => ({ pid: p.pid, sig: sigOf(p.tag), from: p.difficulty, to: p.target })), null, 2))
    console.log('dry 模式：计划已写入 storage/oj_problems/oj155_difficulty_plan.json，未提交')
    return
  }

  // 4. 登录
  await api('/login', 'POST', { uname, password })
  if (!COOKIE) throw new Error('登录失败：未拿到会话 cookie')
  console.log('登录 OK')

  // 5. 备份待改题目关键字段
  const backup = {}
  for (const p of changed) {
    const { json } = await api(`/p/${p.pid}`)
    const d = json.pdoc
    backup[p.pid] = { title: d.title, content: d.content, tag: d.tag, difficulty: d.difficulty }
  }
  fs.writeFileSync(BACKUP, JSON.stringify(backup, null, 2))
  console.log(`已备份 ${Object.keys(backup).length} 题 → ${BACKUP}`)

  // 6. 试改第一题并验证
  const first = changed[0]
  const b = backup[first.pid]
  await api(`/p/${first.pid}/edit`, 'POST', { pid: first.pid, title: b.title, content: b.content, tag: b.tag.join(','), difficulty: String(first.target) })
  const check = await api(`/p/${first.pid}`)
  const d = check.json ? check.json.pdoc : null
  const okFirst = d && d.difficulty === first.target && d.content === b.content && d.title === b.title && d.pid === first.pid && JSON.stringify(d.tag) === JSON.stringify(b.tag)
  if (!okFirst) {
    console.error('试改详情:', JSON.stringify({
      expect: first.target,
      got: d && d.difficulty,
      typeGot: typeof (d && d.difficulty),
      titleOk: d && d.title === b.title,
      contentOk: d && d.content === b.content,
      tagOk: d && JSON.stringify(d.tag) === JSON.stringify(b.tag),
      pidOk: d && d.pid === first.pid,
    }, null, 2))
    throw new Error('试改失败，终止')
  }
  console.log(`试改成功: ${first.pid} → ${first.target}`)

  // 7. 批量执行
  let ok = 0
  const failed = []
  for (const p of changed.slice(1)) {
    const bb = backup[p.pid]
    try {
      const r = await api(`/p/${p.pid}/edit`, 'POST', { pid: p.pid, title: bb.title, content: bb.content, tag: bb.tag.join(','), difficulty: String(p.target) })
      const v = await api(`/p/${p.pid}`)
      const dd = v.json && v.json.pdoc
      if (dd && dd.difficulty === p.target && dd.content === bb.content && dd.title === bb.title && dd.pid === p.pid && JSON.stringify(dd.tag) === JSON.stringify(bb.tag)) ok++
      else {
        failed.push(p.pid)
        if (failed.length <= 3) console.error(`FAIL样本 ${p.pid}: post=${r.status} got=${dd && dd.difficulty} expect=${p.target} postText=${String(r.text || '').slice(0, 100)}`)
      }
    } catch (e) {
      failed.push(p.pid)
      console.error(`FAIL ${p.pid}: ${e.message}`)
    }
  }
  console.log(`\n完成: ${ok + 1}/${changed.length} 成功${failed.length ? '，失败: ' + failed.join(',') : ''}`)

  // 8. 终验分布
  const final = {}
  for (let page = 1; page <= 3; page++) {
    const { json } = await api(`/p?page=${page}`)
    json.pdocs.forEach((d2) => { if (d2.pid !== 'P0') final[d2.difficulty] = (final[d2.difficulty] || 0) + 1 })
  }
  console.log(`终验分布: ${JSON.stringify(final)}`)
})().catch((e) => {
  console.error('❌ 失败:', e.message)
  process.exit(1)
})
