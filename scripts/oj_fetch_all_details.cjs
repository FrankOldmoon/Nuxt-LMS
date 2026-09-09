/**
 * 抓取 10.28.1.155 全部题目详情（title/tag/content 摘要），供细化 difficulty 定级分析
 * 输出: storage/oj_problems/oj155_all_details.json
 */
const fs = require('fs')
const path = require('path')

const BASE = 'http://10.28.1.155'
const OUT = path.join(__dirname, '..', 'storage', 'oj_problems', 'oj155_all_details.json')
let COOKIE = ''

async function api(p, method = 'GET', form) {
  // ⚠️ POST 不带 Accept: application/json（edit 类路由的 JSON 响应器会 500 且不落库），
  // 完整踩坑文档见 scripts/oj_refine_difficulty.cjs 头部注释
  const headers = method === 'GET' ? { Accept: 'application/json' } : {}
  if (COOKIE) headers.Cookie = COOKIE
  const res = await fetch(BASE + p, { method, headers, redirect: 'manual', body: form ? new URLSearchParams(form) : undefined })
  const sc = res.headers.getSetCookie ? res.headers.getSetCookie() : []
  if (sc.length) COOKIE = sc.map((c) => c.split(';')[0]).join('; ')
  const text = await res.text()
  try { return { status: res.status, json: JSON.parse(text) } } catch { return { status: res.status, text } }
}

;(async () => {
  const [uname, password] = process.argv.slice(2)
  await api('/login', 'POST', { uname, password })
  if (!COOKIE) throw new Error('登录失败')
  console.log('登录 OK')

  const problems = []
  for (let page = 1; page <= 3; page++) {
    const { json } = await api(`/p?page=${page}`)
    problems.push(...json.pdocs.map((d) => ({ pid: d.pid, title: d.title, tag: d.tag || [], difficulty: d.difficulty })))
  }
  console.log(`共 ${problems.length} 题`)

  const out = []
  for (const p of problems) {
    const { json } = await api(`/p/${p.pid}`)
    const d = json.pdoc
    // content 去掉 markdown 标记取前 300 字符作摘要
    const plain = String(d.content || '').replace(/[#*`>\-\[\]()!]/g, ' ').replace(/\s+/g, ' ').trim()
    out.push({ pid: p.pid, title: d.title, tag: d.tag || [], difficulty: d.difficulty, snippet: plain.slice(0, 300) })
    process.stdout.write(`${p.pid} `)
  }
  fs.writeFileSync(OUT, JSON.stringify(out, null, 2))
  console.log(`\n已保存 ${out.length} 题详情 → ${OUT}`)
})().catch((e) => { console.error('❌', e.message); process.exit(1) })
