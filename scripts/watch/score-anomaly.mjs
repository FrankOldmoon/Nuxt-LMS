/**
 * 学生分数异常监测
 *
 * 数据源：直连生产库只读查询（user_courses / user_chapters / users）
 *        + 本地快照 logs/score-state.json（用于「分数突增」增量判定）
 *
 * 用法：
 *   node scripts/watch/score-anomaly.mjs                 # 只看（不写库）
 *   node scripts/watch/score-anomaly.mjs --notify        # 有 critical 就发站内通知给所有管理员
 *   node scripts/watch/score-anomaly.mjs --json          # 机器可读
 *   node scripts/watch/score-anomaly.mjs --course=9      # 只看某门课
 *   node scripts/watch/score-anomaly.mjs --update-baseline  # 手动刷新快照
 *
 * 判定规则：
 *   S1 课程总分/章节分为负            → critical（总分）/ warn（章节，可能是教师扣分）
 *   S2 有分但零进度（刷分或直改库）    → critical
 *   S3 分数突增（对比上次快照）        → warn，超过 JUMP_ABS 或翻倍
 *   S4 exp / coin 为负                → warn
 *   S5 有章节记录但一节未通过却有高分  → warn
 *
 * 通知：--notify 时给 roles.code='admin' 的所有用户插 notifications 记录；
 *      同一批异常（签名相同）24h 内只通知一次，避免刷屏（状态存 logs/score-state.json）。
 */
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs'
import { spawnSync } from 'node:child_process'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import postgres from 'postgres'
import { getProdUrl } from '../_prod-url.mjs'

const here = dirname(fileURLToPath(import.meta.url))
const STATE_FILE = resolve(here, '../../logs/score-state.json')
const args = process.argv.slice(2)
const argOf = (k) => args.find((a) => a.startsWith(`--${k}=`))?.split('=').slice(1).join('=')
const has = (k) => args.includes(`--${k}`)

const NOTIFY = has('notify')
const JSON_OUT = has('json')
const UPDATE_BASELINE = has('update-baseline')
const WITH_LOG = !has('no-log')
const ONLY_COURSE = Number(argOf('course') || 0)
const TZ = process.env.LMS_TZ || 'Asia/Shanghai'
/** 要分析的写入日志日期（服务器日志按本地日期分目录） */
const DAY_OF_LOG = argOf('day') || new Intl.DateTimeFormat('sv-SE', { timeZone: TZ }).format(new Date())

/** 有分但零进度的分数门槛 */
const MIN_SCORE_NO_PROGRESS = 50
/**
 * 日净涨幅阈值：两次运行之间的累计涨分。
 * 实测（11-10 全量日志）单日总加分 P50=41 / P95=300 / P99=549 / max=1211，
 * 所以 300 会天天误报 5% 的学生，默认抬到 800。
 */
const JUMP_ABS = Number(process.env.LMS_SCORE_JUMP || 800)
const JUMP_RATIO = 1.0 // 翻倍
/**
 * 单步加分阈值：一次提交最多加多少分。
 * 实测单步 P50=5 / P99=20 / max=45（course 8 的大题），所以 >100 基本不可能是正常任务。
 */
const STEP_JUMP = Number(process.env.LMS_STEP_JUMP || 100)
/** 单日加分次数 / 总额超此值列入「异常勤奋」供人工判断 */
const DAY_WRITES = Number(process.env.LMS_DAY_WRITES || 200)
const DAY_SCORE = Number(process.env.LMS_DAY_SCORE || 1000)
/** 同一学生同一课程同一分钟被写分次数（一次提交会触发多次重算，常规约 5-18 次） */
const MINUTE_WRITES = Number(process.env.LMS_MINUTE_WRITES || 25)
/** 通知去重窗口 */
const NOTIFY_DEDUPE_HOURS = 24

/** SSH 拉当天写入日志 */
const SSH_KEY = process.env.LMS_SSH_KEY || '/Users/oldmoon/Documents/github/151/10.28.1.151_id_ed25519'
const SSH_HOST = process.env.LMS_SSH_HOST || 'root@10.28.1.151'
const REMOTE_DIR = process.env.LMS_REMOTE_DIR || '/www/wwwroot/nuxt_lms_2026'

function fetchDayWrites(day) {
  const local = argOf('log-file')
  let raw = ''
  if (local) {
    if (!existsSync(resolve(local))) return { error: `本地日志不存在：${local}` }
    raw = readFileSync(resolve(local), 'utf8')
  } else {
    const r = spawnSync('ssh', [
      '-i', SSH_KEY, '-o', 'IdentitiesOnly=yes', '-o', 'StrictHostKeyChecking=no', '-o', 'BatchMode=yes',
      SSH_HOST, `cat ${REMOTE_DIR}/logs/${day}/db-writes.jsonl 2>/dev/null || echo __NOFILE__`,
    ], { encoding: 'utf8', maxBuffer: 96 * 1024 * 1024 })
    if (r.status !== 0) return { error: `SSH 失败（status=${r.status}）` }
    raw = r.stdout
    if (raw.trim() === '__NOFILE__') return { error: `远端无当天日志` }
  }
  const writes = []
  let bad = 0
  for (const line of raw.split('\n')) {
    const s = line.trim()
    if (!s) continue
    try { writes.push(JSON.parse(s)) } catch { bad++ }
  }
  return { writes, bad }
}

const alerts = []
function addAlert(level, code, msg, rows) {
  alerts.push({ level, code, msg, count: rows?.length ?? 0, rows: rows?.slice(0, 20) })
}

const state = (() => {
  try {
    return existsSync(STATE_FILE) ? JSON.parse(readFileSync(STATE_FILE, 'utf8')) : null
  } catch {
    return null
  }
})()

const sql = postgres(getProdUrl(), { max: 1 })
const nextScores = {}
const nextStateExtra = {}
let notifyResult = null
let baselineMode = 'created'
let logStat = null

try {
  // ---------- S1a 课程总分为负 ----------
  const negCourse = await sql`
    select uc.user_id, u.username, uc.course_id, uc.score
    from user_courses uc join users u on u.id = uc.user_id
    where uc.score < 0 ${ONLY_COURSE ? sql`and uc.course_id = ${ONLY_COURSE}` : sql``}
    order by uc.score limit 20`
  if (negCourse.length) addAlert('critical', 'negative_course_score', `${negCourse.length} 条课程总分为负数`, negCourse)

  // ---------- S1b 章节分为负（小幅扣分是正常教学行为，只报大幅） ----------
  const negChapter = await sql`
    select uc.user_id, u.username, uc.chapter_id, c.course_id, uc.score
    from user_chapters uc
    join users u on u.id = uc.user_id
    left join chapters c on c.id = uc.chapter_id
    where uc.score < -10 ${ONLY_COURSE ? sql`and c.course_id = ${ONLY_COURSE}` : sql``}
    order by uc.score limit 20`
  if (negChapter.length) {
    addAlert('warn', 'negative_chapter_score',
      `${negChapter.length} 条章节分低于 -10（-1~-10 的小幅扣分视为正常，不计入）`, negChapter)
  }

  // ---------- S2 有分但零进度 ----------
  const noProgress = await sql`
    select uc.user_id, u.username, uc.course_id, uc.score, uc.exp
    from user_courses uc join users u on u.id = uc.user_id
    where uc.is_teacher is not true
      and uc.score >= ${MIN_SCORE_NO_PROGRESS}
      ${ONLY_COURSE ? sql`and uc.course_id = ${ONLY_COURSE}` : sql``}
      and not exists (
        select 1 from user_chapters x
        where x.user_id = uc.user_id
          and x.chapter_id in (select id from chapters where course_id = uc.course_id)
      )
    order by uc.score desc limit 20`
  if (noProgress.length) {
    addAlert('critical', 'score_without_progress',
      `${noProgress.length} 名学生有分数但该课程零章节记录（疑似刷分或直接改库）`, noProgress)
  }

  // ---------- S4 exp / coin 为负 ----------
  const negExp = await sql`
    select uc.user_id, u.username, uc.course_id, uc.exp, uc.coin
    from user_courses uc join users u on u.id = uc.user_id
    where (uc.exp < 0 or uc.coin < 0)
      ${ONLY_COURSE ? sql`and uc.course_id = ${ONLY_COURSE}` : sql``}
    limit 20`
  if (negExp.length) addAlert('warn', 'negative_exp_coin', `${negExp.length} 条 exp/coin 为负`, negExp)

  // ---------- S5~S7 从当天写入日志重建分数轨迹，抓「瞬时刷分」 ----------
  // 快照只能看两次运行之间的净涨，抓不到「一次提交暴涨」；这里按日志时序还原每次加分。
  if (WITH_LOG) {
    const { writes, bad, error } = fetchDayWrites(DAY_OF_LOG)
    if (error) {
      alerts.push({ level: 'info', code: 'log_unavailable', msg: `未读取当天写入日志，跳过瞬时刷分判定（${error}）`, count: 0 })
    } else {
      // user_courses 分数更新：params = [score, attitude, exp, coin, updated_at, user_id, course_id]
      const traj = new Map()
      for (const w of writes) {
        if (w.table !== 'user_courses' || w.op !== 'UPDATE') continue
        if (!/set\s+"score"\s*=/.test(w.sql || '')) continue
        let p
        try { p = JSON.parse(String(w.params)) } catch { continue }
        if (!Array.isArray(p) || p.length < 7) continue
        const uid = Number(p[5]); const cid = Number(p[6]); const score = Number(p[0])
        if (!Number.isFinite(uid) || !Number.isFinite(cid) || !Number.isFinite(score)) continue
        if (ONLY_COURSE && cid !== ONLY_COURSE) continue
        const k = `${uid}:${cid}`
        if (!traj.has(k)) traj.set(k, [])
        traj.get(k).push({ t: String(w.time), score })
      }

      const bigSteps = []
      const busy = []
      const bursts = []
      for (const [k, seq] of traj) {
        const [uid, cid] = k.split(':').map(Number)
        seq.sort((a, b) => a.t.localeCompare(b.t))
        let prev = null
        let total = 0
        let count = 0
        let maxStep = 0
        const perMin = new Map()
        for (const s of seq) {
          if (prev !== null) {
            const d = s.score - prev
            if (d > 0) {
              total += d
              count++
              if (d > maxStep) maxStep = d
              if (d >= STEP_JUMP) {
                bigSteps.push({ user_id: uid, course_id: cid, delta: Math.round(d * 100) / 100, at: s.t })
              }
            }
          }
          prev = s.score
          const m = s.t.slice(0, 16)
          perMin.set(m, (perMin.get(m) || 0) + 1)
        }
        if (count >= DAY_WRITES || total >= DAY_SCORE) {
          busy.push({ user_id: uid, course_id: cid, writes: count, total: Math.round(total), max_step: Math.round(maxStep) })
        }
        for (const [m, n] of perMin) {
          if (n >= MINUTE_WRITES) bursts.push({ user_id: uid, course_id: cid, minute: m, writes: n })
        }
      }

      logStat = { writes: writes.length, bad, pairs: traj.size }
      if (bigSteps.length) {
        bigSteps.sort((a, b) => b.delta - a.delta)
        addAlert('critical', 'step_jump',
          `${bigSteps.length} 次单步加分 ≥${STEP_JUMP} 分（正常单步 P99 仅 20 分，历史最大 45），疑似直接改分或异常奖励`,
          bigSteps)
      }
      if (busy.length) {
        busy.sort((a, b) => b.total - a.total)
        addAlert('warn', 'busy_scoring',
          `${busy.length} 个「学生·课程」单日加分异常密集（≥${DAY_WRITES} 次或 ≥${DAY_SCORE} 分），需人工确认是否正常勤奋`,
          busy)
      }
      if (bursts.length) {
        bursts.sort((a, b) => b.writes - a.writes)
        addAlert('warn', 'minute_burst',
          `${bursts.length} 次「同一分钟 ≥${MINUTE_WRITES} 次写分」（一次提交通常触发 5-18 次重算，过密可能是脚本化提交）`,
          bursts)
      }
    }
  }

  // ---------- 取全量快照（供 S3 与下次对比） ----------
  const allScores = await sql`
    select user_id, course_id, score from user_courses
    where is_teacher is not true ${ONLY_COURSE ? sql`and course_id = ${ONLY_COURSE}` : sql``}`
  // --update-baseline：只刷新基线，不与旧快照比对
  const prev = UPDATE_BASELINE ? null : (state?.scores || null)
  baselineMode = prev ? 'compared' : 'created'
  const jumps = []
  for (const r of allScores) {
    const key = `${r.user_id}:${r.course_id}`
    const cur = Number(r.score)
    nextScores[key] = cur
    if (!prev) continue
    const old = prev[key]
    if (typeof old !== 'number') continue
    const delta = cur - old
    if (delta > 0 && (delta >= JUMP_ABS || (old > 0 && delta / old >= JUMP_RATIO))) {
      jumps.push({ user_id: r.user_id, course_id: r.course_id, from: old, to: cur, delta: Math.round(delta * 100) / 100 })
    }
  }
  if (jumps.length) {
    jumps.sort((a, b) => b.delta - a.delta)
    addAlert(jumps.some((j) => j.delta >= JUMP_ABS * 3) ? 'critical' : 'warn', 'score_jump',
      `${jumps.length} 名学生分数单次涨幅超过阈值（≥${JUMP_ABS} 分或翻倍）`, jumps)
  }
  if (!prev && !JSON_OUT) {
    console.log('[score] 首次运行，已建立分数基线（下次开始判定突增）')
  }

  // ---------- 通知管理员 ----------
  if (NOTIFY) {
    const critical = alerts.filter((a) => a.level === 'critical')
    if (!critical.length) {
      notifyResult = { skipped: 'no-critical' }
    } else {
      const signature = critical.map((a) => `${a.code}:${a.count}`).sort().join('|')
      const last = state?.notified?.[signature]
      const fresh = !last || (Date.now() - new Date(last).getTime()) > NOTIFY_DEDUPE_HOURS * 3600e3
      if (!fresh) {
        notifyResult = { skipped: 'deduped', signature }
      } else {
        const admins = await sql`
          select u.id, u.username
          from users u
          join user_roles ur on ur.user_id = u.id
          join roles r on r.id = ur.role_id
          where r.code = 'admin' and u.deleted_at is null`
        const text = critical.map((a) => `· ${a.msg}`).join('\n').slice(0, 1800)
        for (const a of admins) {
          await sql`
            insert into notifications (user_id, name, content, data)
            values (
              ${a.id},
              ${'⚠️ 学生分数异常'},
              ${sql.json({ text })},
              ${sql.json({ type: 'scoreAnomaly', at: new Date().toISOString(), alerts: critical.map(c => ({ code: c.code, msg: c.msg, count: c.count })) })}
            )`
        }
        notifyResult = { notified: admins.map((a) => a.username) }
        ;(nextStateExtra.notified ||= {})[signature] = new Date().toISOString()
      }
    }
  }
} catch (e) {
  addAlert('critical', 'score_check_error', `分数巡检失败：${String(e?.message || e)}`)
} finally {
  await sql.end()
}

// 合并通知去重记录（保留近 40 条）
const notified = { ...(state?.notified || {}), ...(nextStateExtra.notified || {}) }
const trimmed = Object.fromEntries(
  Object.entries(notified).sort((a, b) => String(b[1]).localeCompare(String(a[1]))).slice(0, 40),
)

if (!has('no-save')) {
  mkdirSync(dirname(STATE_FILE), { recursive: true })
  writeFileSync(STATE_FILE, JSON.stringify({
    at: new Date().toISOString(),
    scores: nextScores,
    notified: trimmed,
  }, null, 2))
}

const result = {
  at: new Date().toISOString(),
  ok: !alerts.some((a) => a.level === 'critical'),
  students: Object.keys(nextScores).length,
  log: logStat,
  alerts,
  notify: notifyResult,
  baseline: baselineMode,
}

if (JSON_OUT) {
  console.log(JSON.stringify(result, null, 2))
  process.exit(result.ok ? 0 : 2)
}

console.log(`\n=== 学生分数异常监测 ${result.at} ===`)
console.log(`扫描 ${result.students} 条选课分数记录${ONLY_COURSE ? `（仅课程 ${ONLY_COURSE}）` : ''} | 基线 ${result.baseline === 'compared' ? '已对比' : '首次建立'}`)
if (logStat) {
  console.log(`写入日志 ${logStat.writes} 条（${DAY_OF_LOG}），其中 ${logStat.pairs} 个「学生·课程」有加分轨迹${logStat.bad ? ` | 坏行 ${logStat.bad}` : ''}`)
}
if (alerts.length === 0) {
  console.log('\n✓ 未发现分数异常')
} else {
  console.log(`\n发现 ${alerts.length} 项异常：`)
  for (const a of alerts) {
    console.log(`  ${a.level === 'critical' ? '✗' : '!'} [${a.level}] ${a.msg}`)
    for (const r of a.rows || []) {
      const who = r.username ? `${r.username}(${r.user_id})` : `uid=${r.user_id}`
      let extra = ''
      if (r.from !== undefined) extra = ` ${r.from} → ${r.to}（+${r.delta}）`
      else if (r.delta !== undefined) extra = ` 单步 +${r.delta} @ ${r.at}`
      else if (r.total !== undefined) extra = ` 单日 +${r.total}（${r.writes} 次，单步最大 ${r.max_step}）`
      else if (r.minute !== undefined) extra = ` ${r.minute} 分钟 ${r.writes} 次`
      else if (r.score !== undefined) extra = ` score=${r.score}`
      console.log(`      ${who} course=${r.course_id ?? '-'}${extra}`)
    }
    if (a.count > (a.rows?.length ?? 0)) console.log(`      …共 ${a.count} 条`)
  }
  if (notifyResult) {
    if (notifyResult.notified) console.log(`\n已发站内通知给管理员：${notifyResult.notified.join(', ')}`)
    else if (notifyResult.skipped === 'no-critical') console.log('\n无 critical，未发通知')
    else if (notifyResult.skipped === 'deduped') console.log('\n同类异常已在 24h 内通知过，跳过')
  } else {
    console.log('\n（未加 --notify，仅输出报告）')
  }
}
console.log('')
process.exit(result.ok ? 0 : 2)
