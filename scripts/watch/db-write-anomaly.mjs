/**
 * DB 写入异常判定（基于线上 db-writes.jsonl 应用层审计日志）
 *
 * 数据来源：modules/base/server/utils/dbAudit.ts 落的 logs/<日期>/db-writes.jsonl
 * 通过 SSH 从生产机拉取分析，不写任何东西。
 *
 * 用法：
 *   node scripts/watch/db-write-anomaly.mjs                    # 今天（服务器本地日期）
 *   node scripts/watch/db-write-anomaly.mjs --day=2026-11-09   # 指定日期
 *   node scripts/watch/db-write-anomaly.mjs --detail           # 打印敏感写入明细
 *   node scripts/watch/db-write-anomaly.mjs --json             # 机器可读
 *   node scripts/watch/db-write-anomaly.mjs --file=logs/x.jsonl  # 读本地文件（离线分析）
 *
 * 环境变量：LMS_SSH_KEY / LMS_SSH_HOST / LMS_REMOTE_DIR
 *
 * 判定规则见 RULES 注释。退出码：0 无异常，2 有 critical。
 */
import { spawnSync } from 'node:child_process'
import { readFileSync, existsSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const args = process.argv.slice(2)
const argOf = (k) => args.find((a) => a.startsWith(`--${k}=`))?.split('=').slice(1).join('=')
const has = (k) => args.includes(`--${k}`)

const SSH_KEY = process.env.LMS_SSH_KEY || '/Users/oldmoon/Documents/github/151/10.28.1.151_id_ed25519'
const SSH_HOST = process.env.LMS_SSH_HOST || 'root@10.28.1.151'
const REMOTE_DIR = process.env.LMS_REMOTE_DIR || '/www/wwwroot/nuxt_lms_2026'
const TZ = process.env.LMS_TZ || 'Asia/Shanghai'

const DAY = argOf('day') || new Intl.DateTimeFormat('sv-SE', { timeZone: TZ }).format(new Date())
const LOCAL_FILE = argOf('file')
const DETAIL = has('detail')
const JSON_OUT = has('json')

// ---------------- 判定规则参数 ----------------
/** 高危表：改了就该有人知道 */
const SENSITIVE = new Set([
  'users', 'user_roles', 'user_classes', 'user_courses',
  'configs', 'courses', 'chapters', 'files', 'roles', 'permissions',
])
/** 工作时段（本地小时），之外写敏感表算可疑 */
const WORK_HOURS = { from: 6, to: 23 }
/** 同一 actor 对同一表，1 分钟内超过该次数视为批量操作 */
const BURST_PER_MIN = 60
/** 慢写阈值 */
const SLOW_MS = 1000
/** chapters 大参数（内容覆盖）阈值：参数序列化后字符数 */
const BIG_CONTENT_CHARS = 5000

const alerts = []
function alert(level, code, msg, rows) {
  alerts.push({ level, code, msg, ...(rows?.length ? { rows } : {}) })
}

// ---------------- 取数 ----------------
let raw = ''
let source = ''
if (LOCAL_FILE) {
  const p = resolve(LOCAL_FILE)
  if (!existsSync(p)) {
    console.error(`文件不存在：${p}`)
    process.exit(1)
  }
  raw = readFileSync(p, 'utf8')
  source = `local:${p}`
} else {
  const remote = `${REMOTE_DIR}/logs/${DAY}/db-writes.jsonl`
  const r = spawnSync('ssh', [
    '-i', SSH_KEY,
    '-o', 'IdentitiesOnly=yes',
    '-o', 'StrictHostKeyChecking=no',
    '-o', 'BatchMode=yes',
    SSH_HOST,
    `cat ${remote} 2>/dev/null || echo __NOFILE__`,
  ], { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 })
  if (r.status !== 0) {
    console.error(`SSH 失败（status=${r.status}）：${(r.stderr || '').slice(0, 300)}`)
    process.exit(1)
  }
  raw = r.stdout
  if (raw.trim() === '__NOFILE__') {
    console.error(`远端无日志：${remote}（当天可能还没写入）`)
    process.exit(0)
  }
  source = `${SSH_HOST}:${remote}`
}

// ---------------- 解析 ----------------
const rows = []
let badLines = 0
for (const line of raw.split('\n')) {
  const s = line.trim()
  if (!s) continue
  try {
    rows.push(JSON.parse(s))
  } catch {
    badLines++
  }
}

/** UTC ISO -> 本地小时 */
function localHour(iso) {
  const d = new Date(iso)
  return Number(new Intl.DateTimeFormat('en-GB', { hour: '2-digit', hour12: false, timeZone: TZ }).format(d))
}
function localTime(iso) {
  return new Intl.DateTimeFormat('sv-SE', {
    timeZone: TZ, dateStyle: 'short', timeStyle: 'medium',
  }).format(new Date(iso))
}
/** SQL 摘要：去掉参数占位，压成一行 */
function sqlSummary(sql, max = 110) {
  const s = String(sql || '').replace(/\s+/g, ' ').trim()
  return s.length > max ? s.slice(0, max) + '…' : s
}
function actorLabel(a) {
  return a ? `${a.username}(${a.id})` : 'anonymous/null'
}

// ---------------- 规则 ----------------
const byTable = new Map()
const byActor = new Map()
const sensitiveRows = []
const nullActorSensitive = []
const offHours = []
const bursts = new Map()
const failed = []
const slow = []
const bigContent = []

for (const r of rows) {
  const t = r.table || '?'
  byTable.set(t, (byTable.get(t) || 0) + 1)
  const akey = r.actor ? r.actor.username : '__null__'
  byActor.set(akey, (byActor.get(akey) || 0) + 1)

  if (SENSITIVE.has(t)) {
    sensitiveRows.push(r)
    if (!r.actor) nullActorSensitive.push(r)
  }
  // 同一 actor 同表同分钟的次数
  if (r.actor) {
    const k = `${r.actor.id}|${t}|${String(r.time).slice(0, 16)}`
    bursts.set(k, (bursts.get(k) || 0) + 1)
  }
  if (r.ok === false) failed.push(r)
  if (Number(r.ms) > SLOW_MS) slow.push(r)
  if (t === 'chapters' && String(r.params || '').length >= BIG_CONTENT_CHARS) bigContent.push(r)
}

// R1 actor=null 写敏感表 —— 无请求上下文（脚本直连 / 启动任务 / 其他系统）
//    注意：登录、注册也会产生 actor=null（鉴权前写库），必须按 SQL 形态区分，
//    否则每天 200+ 条正常登录副作用会把告警淹没。
const LOGIN_SIDE_EFFECT = /\bset\b[\s\S]*?"?login_at"?/i
const REGISTER_TABLES = new Set(['user_roles', 'user_classes'])
const nullDanger = []
const nullRoutine = []
for (const r of nullActorSensitive) {
  const isLogin = r.table === 'users' && LOGIN_SIDE_EFFECT.test(r.sql || '')
  const isRegister = REGISTER_TABLES.has(r.table) && r.op === 'INSERT'
  if (isLogin || isRegister) nullRoutine.push(r)
  else nullDanger.push(r)
}
if (nullDanger.length) {
  alert('critical', 'null_actor_sensitive',
    `${nullDanger.length} 条高危表写入没有操作者（actor=null），非登录/注册路径，需人工确认来源`,
    nullDanger.slice(0, 20))
}
if (nullRoutine.length) {
  alerts.push({
    level: 'info',
    code: 'null_actor_routine',
    msg: `${nullRoutine.length} 条无操作者写入属登录/注册副作用（login_at 更新、注册时授角色与入班），已忽略`,
  })
}
// R2 改密码
const pwdRows = rows.filter((r) => r.table === 'users' && /set\s+"?password"?\s*=/i.test(r.sql || ''))
if (pwdRows.length) {
  alert('critical', 'password_change', `有 ${pwdRows.length} 次用户密码被改写`, pwdRows.slice(0, 20))
}
// R3 角色授予（排除注册流程：actor 为 null 的那批已在 R1 归类）
const roleRows = rows.filter((r) => r.table === 'user_roles' && r.op === 'INSERT' && r.actor)
if (roleRows.length) {
  alert('warn', 'role_grant', `有 ${roleRows.length} 次带操作者的角色授予（user_roles 插入）`, roleRows.slice(0, 20))
}
// R4 非工作时段写敏感表（只算真实业务变更，登录/注册副作用不算）
const routineSet = new Set(nullRoutine)
const businessSensitive = sensitiveRows.filter((r) => !routineSet.has(r))
for (const r of businessSensitive) {
  const h = localHour(r.time)
  if (!(h >= WORK_HOURS.from && h < WORK_HOURS.to)) offHours.push(r)
}
if (offHours.length) {
  alert('warn', 'off_hours', `${offHours.length} 条业务写入落在非工作时段（本地 ${WORK_HOURS.from}–${WORK_HOURS.to} 点外）`, offHours.slice(0, 20))
}
// R5 批量操作
const hot = [...bursts.entries()].filter(([, n]) => n >= BURST_PER_MIN).sort((a, b) => b[1] - a[1])
if (hot.length) {
  alert('warn', 'burst',
    `${hot.length} 组「同一账号·同一表·同一分钟」写入 ≥${BURST_PER_MIN} 次：` +
    hot.slice(0, 5).map(([k, n]) => `${k.split('|').slice(1).join('/')}×${n}`).join(', '))
}
// R6 失败写入
if (failed.length) {
  alert('warn', 'write_failed', `${failed.length} 条写入失败（ok=false）`, failed.slice(0, 20))
}
// R7 慢写
if (slow.length) {
  alert('warn', 'slow_write', `${slow.length} 条写入耗时 >${SLOW_MS}ms`, slow.slice(0, 20))
}
// R9 硬删除（软删是 UPDATE set deleted_at，出现 DELETE 说明是真删）
const deletes = rows.filter((r) => r.op === 'DELETE')
if (deletes.length) {
  const byT = deletes.reduce((m, r) => (m[r.table] = (m[r.table] || 0) + 1, m), {})
  alert(deletes.length >= 50 ? 'critical' : 'warn', 'hard_delete',
    `${deletes.length} 条硬删除：` + Object.entries(byT).map(([t, n]) => `${t}×${n}`).join(', '),
    deletes.slice(0, 20))
}
// R10 无 where 的 UPDATE / DELETE —— 影响整表，最危险的一类
const noWhereRows = rows.filter((r) => r.noWhere)
if (noWhereRows.length) {
  alert('critical', 'no_where', `${noWhereRows.length} 条 UPDATE/DELETE 没有 where 条件（整表生效）`, noWhereRows.slice(0, 20))
}
// R8 章节内容被覆盖（你之前踩过的坑：老师整章回写）
//    自己人（默认 admin）编辑属正常，只做 info；非白名单账号整篇覆盖才升级为 critical。
const TRUSTED = new Set(
  (process.env.LMS_TRUSTED_ACTORS || 'admin').split(',').map((s) => s.trim()).filter(Boolean),
)
const untrustedOverwrite = bigContent.filter((r) => !r.actor || !TRUSTED.has(r.actor.username))
if (untrustedOverwrite.length) {
  alert('critical', 'chapter_overwrite_untrusted',
    `${untrustedOverwrite.length} 次章节整篇覆盖来自非白名单账号（白名单：${[...TRUSTED].join(',')}）`,
    untrustedOverwrite.slice(0, 20))
} else if (bigContent.length) {
  alerts.push({
    level: 'info',
    code: 'chapter_overwrite_trusted',
    msg: `${bigContent.length} 次章节整篇写入，操作者均在白名单内（${[...new Set(bigContent.map((r) => r.actor?.username))].join(',')}）`,
  })
}

// ---------------- 输出 ----------------
const actors = [...byActor.entries()].sort((a, b) => b[1] - a[1])
const result = {
  at: new Date().toISOString(),
  day: DAY,
  tz: TZ,
  source,
  total: rows.length,
  badLines,
  activeActors: actors.filter(([k]) => k !== '__null__').length,
  nullActorRows: byActor.get('__null__') || 0,
  ok: !alerts.some((a) => a.level === 'critical'),
  alerts,
  tableCounts: Object.fromEntries([...byTable.entries()].sort((a, b) => b[1] - a[1])),
  topActors: actors.slice(0, 10).map(([k, n]) => ({ actor: k, writes: n })),
}

if (JSON_OUT) {
  console.log(JSON.stringify(result, null, 2))
  process.exit(result.ok ? 0 : 2)
}

console.log(`\n=== DB 写入异常判定 ${DAY}（${TZ}）===`)
console.log(`来源 ${source}`)
console.log(`写入 ${rows.length} 条 | 活跃账号 ${result.activeActors} | 无操作者 ${result.nullActorRows} | 坏行 ${badLines}`)
console.log(`敏感表写入 ${sensitiveRows.length} 条：` +
  Object.entries(result.tableCounts).filter(([t]) => SENSITIVE.has(t)).map(([t, n]) => `${t}:${n}`).join(' ') || '无')

console.log('\n写入量 Top8：')
for (const [t, n] of Object.entries(result.tableCounts).slice(0, 8)) console.log(`  ${t.padEnd(18)} ${n}`)
console.log('\n活跃账号 Top5：')
for (const a of result.topActors.slice(0, 5)) console.log(`  ${String(a.actor).padEnd(18)} ${a.writes}`)

if (alerts.length === 0) {
  console.log('\n✓ 未发现异常写入')
} else {
  console.log(`\n发现 ${alerts.length} 项异常：`)
  for (const a of alerts) {
    console.log(`  ${a.level === 'critical' ? '✗' : '!'} [${a.level}] ${a.msg}`)
  }
}

if (DETAIL) {
  // 只列「真需要人看」的表：内容/课程结构/权限/配置。
  // user_courses、user_chapters 这类高频学习数据（做题、任务点）会淹没输出，故排除；
  // users 只保留非登录副作用的改动（改资料、改密码等）。
  const DETAIL_TABLES = new Set(['users', 'user_roles', 'user_classes', 'roles', 'permissions', 'configs', 'courses', 'chapters'])
  const detailRows = sensitiveRows.filter((r) => {
    if (!DETAIL_TABLES.has(r.table)) return false
    if (r.table === 'users' && LOGIN_SIDE_EFFECT.test(r.sql || '')) return false
    return true
  })
  console.log(`\n--- 内容/权限/配置类写入明细（${detailRows.length} 条）---`)
  if (!detailRows.length) console.log('  （无）')
  for (const r of detailRows.slice(0, 40)) {
    const flag = r.noWhere ? ' ⚠无where' : ''
    console.log(`  ${localTime(r.time)} ${r.op.padEnd(6)} ${r.table.padEnd(14)} ${actorLabel(r.actor)} | ${sqlSummary(r.sql, 90)}${flag}`)
  }
  if (detailRows.length > 40) console.log(`  …另有 ${detailRows.length - 40} 条`)
}
console.log('')
process.exit(result.ok ? 0 : 2)
