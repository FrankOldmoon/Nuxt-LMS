/**
 * OJ 题目正文回填脚本
 *
 * 背景：questions 表里 oj 题目的 content 只存 pid，正文靠 /api/questions/show 实时去 OJ 拉。
 * OJ 一旦抖动（实测 8~20s、偶发 502），正文拉不到，前端就显示「OJ 题目内容加载失败」。
 * 现在服务端已改为「拉到就回填进库 + 内存缓存 + 超时」，这个脚本做两件事：
 *   1) 一次性把历史上只存 pid 的题全部回填（OJ 恢复在线时跑一遍即可）
 *   2) 之后作为巡检：报告哪些题仍缺正文
 *
 * 用法：
 *   node scripts/oj_backfill_statements.mjs --dry            # 只看会写什么，不落库
 *   node scripts/oj_backfill_statements.mjs                  # 全量回填
 *   node scripts/oj_backfill_statements.mjs --course=5       # 只处理某门课
 *   node scripts/oj_backfill_statements.mjs --limit=10       # 只处理前 N 道
 *   node scripts/oj_backfill_statements.mjs --concurrency=3  # 并发数（默认 3，OJ 弱别调高）
 *
 * 只回填「content 仍是 pid 占位」的题目，绝不覆盖老师手工编辑过的正文（SQL 侧带同样条件）。
 */
import postgres from 'postgres'
import { getProdUrl } from './_prod-url.mjs'

const args = process.argv.slice(2)
const DRY = args.includes('--dry')
const COURSE = Number((args.find(a => a.startsWith('--course=')) || '').split('=')[1] || 0)
const LIMIT = Number((args.find(a => a.startsWith('--limit=')) || '').split('=')[1] || 0)
const CONCURRENCY = Number((args.find(a => a.startsWith('--concurrency=')) || '').split('=')[1] || 3)
const TIMEOUT_MS = 8000
const RETRIES = 2

const sql = postgres(getProdUrl(), { max: 1 })

function normalize(url) {
  return String(url || '').trim().replace(/\/+$/, '')
}

async function getOjBase() {
  const rows = await sql`select value from configs where id = 'lms:oj.url' limit 1`
  const base = normalize(rows[0]?.value)
  if (!base) throw new Error('[oj-backfill] 系统设置里的 OJ 基础地址为空，请先到管理后台填写')
  return base
}

const sleep = (ms) => new Promise(r => setTimeout(r, ms))

/** 拉一次正文：{zh,en} → en||zh；content 本身是 markdown 就原样返回 */
async function fetchStatement(base, pid) {
  const res = await fetch(`${base}/p/${pid}`, {
    headers: { Accept: 'application/json' },
    signal: AbortSignal.timeout(TIMEOUT_MS),
  })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  const data = await res.json()
  const raw = data?.pdoc?.content
  if (!raw) throw new Error('响应里没有 pdoc.content')
  let parsed
  try { parsed = JSON.parse(raw) } catch { return String(raw) }
  if (typeof parsed === 'string') return parsed
  return parsed?.en || parsed?.zh || ''
}

async function handleOne(base, q) {
  for (let i = 0; i <= RETRIES; i++) {
    try {
      const text = await fetchStatement(base, q.pid)
      if (!text.trim()) throw new Error('正文为空')
      if (DRY) {
        console.log(`  [dry] course=${q.course_id} cid=${q.cid} ${q.pid} → 会写入 ${text.length} 字符`)
      } else {
        const written = await sql`
          update questions set content = to_jsonb(${text}::text)
          where course_id = ${q.course_id} and cid = ${q.cid}
            and content #>> '{}' = ${q.pid}::text
          returning cid`
        console.log(`  ${written.length ? '✅' : '⚠️ 跳过（正文已被改过）'} course=${q.course_id} cid=${q.cid} ${q.pid} ${text.length} 字符`)
      }
      return true
    } catch (e) {
      if (i === RETRIES) {
        console.log(`  ❌ course=${q.course_id} cid=${q.cid} ${q.pid} → ${e.message}`)
        return false
      }
      await sleep(600 * (i + 1))
    }
  }
  return false
}

const base = await getOjBase()
console.log(`OJ base: ${base}${DRY ? '（dry run，不写库）' : ''}`)

const rows = await sql`
  select course_id, cid, options->>'pid' as pid
  from questions
  where type = 'oj'
    and jsonb_typeof(content) = 'string'
    and (content #>> '{}') = coalesce(options->>'pid', '')
    ${COURSE ? sql`and course_id = ${COURSE}` : sql``}
  order by course_id, cid
  ${LIMIT ? sql`limit ${LIMIT}` : sql``}`

console.log(`待回填 ${rows.length} 题`)
if (!rows.length) {
  await sql.end()
  process.exit(0)
}

let ok = 0
let failed = 0
let cursor = 0
async function worker() {
  while (cursor < rows.length) {
    const q = rows[cursor++]
    if (await handleOne(base, q)) ok++
    else failed++
    await sleep(200) // 给 OJ 留点喘息，别把它打挂
  }
}
await Promise.all(Array.from({ length: Math.max(1, CONCURRENCY) }, worker))

console.log(`\n完成：成功 ${ok}，失败 ${failed}，共 ${rows.length}`)
if (failed) {
  console.log('失败的题目通常是 OJ 现在不可用（502 / 超时）。OJ 恢复后重跑本脚本即可，服务端也会在有人打开这些题时自动回填。')
}
await sql.end()
