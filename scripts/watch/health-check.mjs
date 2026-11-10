/**
 * LMS 只读巡检（零写入，可安全在生产上反复跑）
 *
 * 用法：
 *   node scripts/watch/health-check.mjs            # 人类可读报告
 *   node scripts/watch/health-check.mjs --json     # 机器可读（供 automation 消费）
 *   node scripts/watch/health-check.mjs --update-baseline   # 首次建立基线 / 确认后重置基线
 *
 * 做什么：
 *   1. 数据库连通、连接数水位、长事务、锁等待
 *   2. 关键表行数 vs 基线快照（突降 = 疑似批量误删）
 *   3. 近 24h 新账号 / 角色变更，管理员名单变动（新增 admin 立即红）
 *   4. 站点 HTTP 探活 + 延迟
 *
 * 不做：不建表、不装触发器、不改任何数据（--update-baseline 只写本地 logs/watch-state.json）。
 */
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import postgres from 'postgres'
import { getProdUrl } from '../_prod-url.mjs'

const here = dirname(fileURLToPath(import.meta.url))
const STATE_FILE = resolve(here, '../../logs/watch-state.json')
const JSON_OUT = process.argv.includes('--json')
const UPDATE_BASELINE = process.argv.includes('--update-baseline')
const SITE = process.env.LMS_SITE || 'http://10.28.1.151'

/** 需要盯行数的关键表 */
const WATCH_TABLES = [
  'users', 'user_roles', 'user_courses', 'user_classes',
  'courses', 'chapters', 'questions', 'homeworks', 'comments',
]
/** 行数跌幅告警阈值 */
const DROP_PCT = 0.05
const DROP_ABS = 20
/** 长事务阈值（秒） */
const LONG_TX_SEC = 300
/** 连接数水位 */
const CONN_WARN_PCT = 0.8

const alerts = []
const info = {}
function alert(level, code, msg, extra) {
  alerts.push({ level, code, msg, ...(extra ? { extra } : {}) })
}
function loadState() {
  try {
    return existsSync(STATE_FILE) ? JSON.parse(readFileSync(STATE_FILE, 'utf8')) : null
  } catch (e) {
    console.warn('[watch] 状态文件解析失败，忽略基线：', e.message)
    return null
  }
}
function saveState(state) {
  mkdirSync(dirname(STATE_FILE), { recursive: true })
  writeFileSync(STATE_FILE, JSON.stringify(state, null, 2))
}

const sql = postgres(getProdUrl(), { max: 1 })
const state = loadState()
const nextState = { at: new Date().toISOString(), tableCounts: {}, admins: [] }

try {
  // ---------- 1. 连接与实例水位 ----------
  const [conn] = await sql`
    select (select count(*) from pg_stat_activity where datname = current_database())::int as cur,
           current_setting('max_connections')::int as max,
           (select count(*) from pg_stat_activity where state = 'active' and datname = current_database())::int as active,
           (select count(*) from pg_stat_activity where wait_event_type = 'Lock')::int as lock_waiting`
  info.connections = conn
  if (conn.cur / conn.max >= CONN_WARN_PCT) {
    alert('warn', 'conn_high', `数据库连接数 ${conn.cur}/${conn.max}，已达 ${Math.round(conn.cur / conn.max * 100)}%`)
  }
  if (conn.lock_waiting > 0) {
    alert('warn', 'lock_waiting', `有 ${conn.lock_waiting} 个会话在等锁`)
  }

  // ---------- 2. 长事务 ----------
  const longTx = await sql`
    select pid, usename, state,
           extract(epoch from (now() - xact_start))::int as sec,
           left(regexp_replace(query, '\s+', ' ', 'g'), 120) as q
    from pg_stat_activity
    where xact_start is not null and now() - xact_start > ${`${LONG_TX_SEC} seconds`}::interval
      and datname = current_database()
    order by sec desc`
  info.longTransactions = longTx
  for (const t of longTx) {
    alert('warn', 'long_tx', `长事务 ${t.sec}s（pid=${t.pid}）：${t.q}`)
  }

  // ---------- 3. 关键表行数 ----------
  const counts = {}
  for (const t of WATCH_TABLES) {
    // 表名来自上面的硬编码白名单；postgres.js 的 sql() 不会把字符串当标识符，故用 unsafe 拼引号
    const [r] = await sql.unsafe(`select count(*)::int as c from "${t}"`)
    counts[t] = r.c
  }
  info.tableCounts = counts
  nextState.tableCounts = counts

  if (state?.tableCounts) {
    for (const [t, cur] of Object.entries(counts)) {
      const prev = state.tableCounts[t]
      if (typeof prev !== 'number' || prev === 0) continue
      const drop = prev - cur
      if (drop > 0 && (drop / prev >= DROP_PCT || drop >= DROP_ABS)) {
        alert('critical', 'table_drop', `表 ${t} 行数从 ${prev} 降到 ${cur}（-${drop}），疑似批量删除`)
      }
    }
  }

  // ---------- 4. 近 24h 账号与角色变动 ----------
  const [newUsers] = await sql`
    select count(*)::int as c from users where created_at > now() - interval '24 hours'`
  info.newUsers24h = newUsers.c

  const roleChanges = await sql`
    select r.code, count(*)::int as c
    from user_roles ur join roles r on r.id = ur.role_id
    where ur.created_at > now() - interval '24 hours'
    group by r.code order by c desc`
  info.roleGrants24h = roleChanges

  const admins = await sql`
    select u.id, u.username, u.name
    from users u
    join user_roles ur on ur.user_id = u.id
    join roles r on r.id = ur.role_id
    where r.code = 'admin' and u.deleted_at is null
    order by u.id`
  info.admins = admins
  nextState.admins = admins

  if (state?.admins) {
    const prevIds = new Set(state.admins.map((a) => a.id))
    const curIds = new Set(admins.map((a) => a.id))
    for (const a of admins) {
      if (!prevIds.has(a.id)) alert('critical', 'admin_added', `新增管理员：${a.username}(${a.id}) ${a.name}`)
    }
    for (const a of state.admins) {
      if (!curIds.has(a.id)) alert('critical', 'admin_removed', `管理员被移除：${a.username}(${a.id}) ${a.name}`)
    }
  }

  // ---------- 5. 登录票据异常（大量 token 常见于撞库/脚本登录） ----------
  const [tk] = await sql`
    select count(*)::int as c from tokens where created_at > now() - interval '1 hour'`
  info.tokensLastHour = tk.c
  if (tk.c >= 200) {
    alert('warn', 'token_spike', `近 1 小时签发 ${tk.c} 个登录票据，疑似撞库或脚本登录`)
  }

  // ---------- 6. 站点探活 ----------
  const t0 = Date.now()
  try {
    const r = await fetch(SITE, { signal: AbortSignal.timeout(8000), redirect: 'manual' })
    info.http = { status: r.status, ms: Date.now() - t0 }
    if (r.status >= 500) alert('critical', 'http_5xx', `站点返回 ${r.status}`)
    else if (r.status >= 400) alert('warn', 'http_4xx', `站点返回 ${r.status}`)
  } catch (e) {
    info.http = { error: String(e?.message || e) }
    alert('critical', 'http_down', `站点不可达：${info.http.error}`)
  }
} catch (e) {
  alert('critical', 'db_error', `数据库巡检失败：${String(e?.message || e)}`)
} finally {
  await sql.end()
}

// ---------- 输出 ----------
if (UPDATE_BASELINE && !alerts.some((a) => a.code === 'db_error')) {
  saveState(nextState)
  if (!JSON_OUT) console.log(`\n[watch] 基线已更新 -> ${STATE_FILE}`)
} else if (!state) {
  // 首次运行没有基线，自动落一份，避免一直无对比
  saveState(nextState)
  if (!JSON_OUT) console.log(`\n[watch] 首次运行，已自动建立基线 -> ${STATE_FILE}`)
}

const result = {
  at: new Date().toISOString(),
  ok: !alerts.some((a) => a.level === 'critical'),
  alerts,
  info,
  baselineUsed: Boolean(state),
}
if (JSON_OUT) {
  console.log(JSON.stringify(result, null, 2))
  process.exit(result.ok ? 0 : 2)
}

const icon = { critical: '✗', warn: '!' }
console.log(`\n=== LMS 巡检 ${result.at} ===`)
console.log(`连接 ${info.connections?.cur}/${info.connections?.max}（active ${info.connections?.active}，等锁 ${info.connections?.lock_waiting}）`)
console.log(`长事务 ${info.longTransactions?.length ?? 0} 个`)
console.log('关键表行数：')
for (const [t, c] of Object.entries(info.tableCounts || {})) {
  const prev = state?.tableCounts?.[t]
  const delta = typeof prev === 'number' ? c - prev : null
  console.log(`  ${t.padEnd(14)} ${String(c).padStart(7)}${delta === null ? '' : `  (${delta >= 0 ? '+' : ''}${delta})`}`)
}
console.log(`近 24h 新账号 ${info.newUsers24h} | 角色授予 ${(info.roleGrants24h || []).map(r => `${r.code}:${r.c}`).join(' ') || '无'}`)
console.log(`近 1h 登录票据 ${info.tokensLastHour} | 站点 ${info.http?.status ?? info.http?.error} ${info.http?.ms ? info.http.ms + 'ms' : ''}`)
console.log(`管理员 ${(info.admins || []).map(a => a.username).join(', ') || '无'}`)

if (alerts.length === 0) {
  console.log('\n✓ 未发现异常')
} else {
  console.log(`\n发现 ${alerts.length} 项异常：`)
  for (const a of alerts) console.log(`  ${icon[a.level] || '-'} [${a.level}] ${a.msg}`)
  console.log('')
}
process.exit(result.ok ? 0 : 2)
