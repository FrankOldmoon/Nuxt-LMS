#!/usr/bin/env node
/**
 * 比对 Hydro（Mongo）与 LMS（Postgres）的用户，产出 SSO 迁移的绑定可行性报告
 *
 * 用法：
 *   node scripts/compare-oauth-users.mjs --hydro /tmp/hydro-users.json
 *
 * Hydro 数据由本脚本外的一条只读命令导出：
 *   db.user.find({}, {_id:1,uname:1,mail:1}) + db.record.distinct('uid')
 *
 * LMS 连接串取 .env 里被注释掉的生产地址（#POSTGRES_URL=...），或 --db 显式指定。
 * 全程只读：只有 select，不写任何数据。
 *
 * 输出：控制台汇总 + /tmp/oauth-mapping-diff.txt（逐条差异，含邮箱，别提交进仓库）
 */

import { readFileSync, writeFileSync } from 'node:fs'
import postgres from 'postgres'
import { getProdUrl } from './_prod-url.mjs'

function arg(name, fallback = '') {
  const i = process.argv.indexOf(`--${name}`)
  return i > -1 ? process.argv[i + 1] : fallback
}

const hydroPath = arg('hydro', '/tmp/hydro-users.json')

// ---- LMS 连接串：优先 --db，其次 .env 里被注释的生产行 ----
let dbUrl = arg('db')
if (!dbUrl) {
  dbUrl = getProdUrl()
}

const hydro = JSON.parse(readFileSync(hydroPath, 'utf8'))
const hydroUsers = hydro.users || []
const activeUids = new Set(hydro.activeUids || [])

const sql = postgres(dbUrl, { max: 1, idle_timeout: 5 })
let lmsUsers
try {
  lmsUsers = await sql`
    select id, username, email, name
    from users
    where deleted_at is null
  `
} finally {
  await sql.end({ timeout: 3 })
}

// ---- 建立 LMS 索引 ----
const lmsByEmail = new Map()
const lmsEmailDup = new Map()
for (const u of lmsUsers) {
  const mail = (u.email || '').trim().toLowerCase()
  if (!mail) continue
  if (lmsByEmail.has(mail)) lmsEmailDup.set(mail, (lmsEmailDup.get(mail) || 1) + 1)
  lmsByEmail.set(mail, u)
}

// ---- 逐条比对 ----
const stats = {
  total: hydroUsers.length,
  placeholder: 0,   // @hydro.local 之类占位邮箱
  matched: 0,
  unmatched: 0,
  activeTotal: 0,
  activeMatched: 0,
  activeUnmatched: 0,
}
const unmatched = []
const matchedSamples = []

for (const h of hydroUsers) {
  const mail = (h.mail || '').trim().toLowerCase()
  const isActive = activeUids.has(h._id)
  if (isActive) stats.activeTotal++

  if (!mail || mail.endsWith('@hydro.local')) {
    stats.placeholder++
    unmatched.push({ ...h, reason: '占位邮箱（@hydro.local 或空）', active: isActive })
    if (isActive) stats.activeUnmatched++
    continue
  }

  const hit = lmsByEmail.get(mail)
  if (hit) {
    stats.matched++
    if (isActive) stats.activeMatched++
    if (matchedSamples.length < 5) matchedSamples.push({ hydro: h, lms: hit })
  } else {
    stats.unmatched++
    unmatched.push({ ...h, reason: 'LMS 中无此邮箱', active: isActive })
    if (isActive) stats.activeUnmatched++
  }
}

// ---- 报告 ----
const pct = (a, b) => (b ? ((a / b) * 100).toFixed(1) + '%' : '-')

console.log('\n================ SSO 绑定可行性 ================')
console.log(`LMS 有效用户（未软删）      : ${lmsUsers.length}`)
console.log(`Hydro 用户                 : ${stats.total}`)
console.log(`  可自动绑定（邮箱命中）    : ${stats.matched}  (${pct(stats.matched, stats.total)})`)
console.log(`  无法自动绑定             : ${stats.unmatched + stats.placeholder}`)
console.log(`    其中占位邮箱           : ${stats.placeholder}`)
console.log(`    其中 LMS 无此邮箱       : ${stats.unmatched}`)
console.log('')
console.log(`Hydro 活跃用户（有提交）    : ${stats.activeTotal}`)
console.log(`  可自动绑定               : ${stats.activeMatched}  (${pct(stats.activeMatched, stats.activeTotal)})`)
console.log(`  需人工处理               : ${stats.activeUnmatched}`)
console.log('')
if (lmsEmailDup.size) {
  console.log(`⚠️ LMS 侧存在重复邮箱       : ${lmsEmailDup.size} 个（SSO 会取其中一条，需人工确认）`)
}
console.log(`⚠️ 无法自动绑定明细已写入   : /tmp/oauth-mapping-diff.txt`)

const lines = []
lines.push('# Hydro ↔ LMS 绑定差异清单')
lines.push(`# 生成时间：${new Date().toISOString()}`)
lines.push(`# 共 ${unmatched.length} 条无法自动绑定（* 表示该用户在 Hydro 有提交记录）`)
lines.push('')
for (const u of unmatched.sort((a, b) => Number(b.active) - Number(a.active))) {
  lines.push(
    `${u.active ? '*' : ' '} uid=${u._id}\tuname=${u.uname}\tmail=${u.mail}\t${u.reason}`,
  )
}
writeFileSync('/tmp/oauth-mapping-diff.txt', lines.join('\n'), 'utf8')

if (matchedSamples.length) {
  console.log('\n--- 命中样例（前 5 条）---')
  for (const s of matchedSamples) {
    console.log(`  ${s.hydro.uname} <${s.hydro.mail}>  →  lms#${s.lms.id} ${s.lms.username}`)
  }
}
console.log('')
