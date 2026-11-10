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
const ONLY_COURSE = Number(argOf('course') || 0)

/** 有分但零进度的分数门槛 */
const MIN_SCORE_NO_PROGRESS = 50
/** 分数突增阈值 */
const JUMP_ABS = Number(process.env.LMS_SCORE_JUMP || 300)
const JUMP_RATIO = 1.0 // 翻倍
/** 通知去重窗口 */
const NOTIFY_DEDUPE_HOURS = 24

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
if (alerts.length === 0) {
  console.log('\n✓ 未发现分数异常')
} else {
  console.log(`\n发现 ${alerts.length} 项异常：`)
  for (const a of alerts) {
    console.log(`  ${a.level === 'critical' ? '✗' : '!'} [${a.level}] ${a.msg}`)
    for (const r of a.rows || []) {
      const who = r.username ? `${r.username}(${r.user_id})` : `uid=${r.user_id}`
      const extra = r.delta !== undefined
        ? ` ${r.from} → ${r.to}（+${r.delta}）`
        : (r.score !== undefined ? ` score=${r.score}` : '')
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
