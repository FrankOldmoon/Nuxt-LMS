#!/usr/bin/env node
/**
 * 预填 Hydro 的 LMS 绑定（mongo oauth 集合）
 *
 * 背景：Hydro 的 OauthCallbackHandler 认领旧账号的顺序是
 *   ① oauth 表 (platform=lms, id=<lms sub>) ② 按 email 查 ③ 注册（canRegister=false 时直接拒绝）
 * 所以必须在关掉密码登录之前把绑定写好，否则 email 对不上的人进不来。
 *
 * 用法：
 *   node scripts/seed-oauth-bindings.mjs                 # dry：只统计与列清单
 *   node scripts/seed-oauth-bindings.mjs --apply         # 真正写入 Hydro
 *   node scripts/seed-oauth-bindings.mjs --map 4:35      # 手工指定 hydroUid:lmsId（可重复）
 *
 * 匹配策略：
 *   1. email 精确（大小写无关）—— 主通道
 *   2. 姓名归一化精确（去空格/点/括号、转小写）且唯一 —— 兜底，解决 LMS 邮箱为空/不一致
 *   3. 其余列入人工清单，不猜测
 *
 * 冲突处理：同一个 LMS 用户被多个 Hydro 账号命中时，优先保留 email 命中那条，
 * 其余标记冲突不写入 —— 宁可漏绑，不可错绑（错绑会串提交记录）。
 */

import { execFileSync } from 'node:child_process'
import { readFileSync, writeFileSync } from 'node:fs'
import postgres from 'postgres'
import { getProdUrl } from './_prod-url.mjs'

const KEY = process.env.HYDRO_SSH_KEY || '/Users/oldmoon/Documents/github/155/10.28.1.155_id_ed25519'
const HOST = process.env.HYDRO_SSH_HOST || 'root@10.28.1.155'
const APPLY = process.argv.includes('--apply')

function argList(name) {
  const out = []
  process.argv.forEach((a, i) => {
    if (a === `--${name}`) out.push(process.argv[i + 1])
  })
  return out
}

// 手工映射：hydroUid:lmsId
const manual = new Map()
for (const pair of argList('map')) {
  const [h, l] = String(pair).split(':').map(Number)
  if (!h || !l) {
    console.error(`--map 格式错误: ${pair}（应为 hydroUid:lmsId）`)
    process.exit(1)
  }
  manual.set(h, l)
}

const ssh = (cmd) =>
  execFileSync('ssh', ['-i', KEY, '-o', 'BatchMode=yes', HOST, cmd], {
    encoding: 'utf8',
    maxBuffer: 20 * 1024 * 1024,
  })

// ---------- 1. 拉 Hydro 用户 ----------
console.log('→ 读取 Hydro 用户…')
const mongoUri = JSON.parse(ssh('cat /root/.hydro/config.json')).uri
const hydroRaw = ssh(
  `${'/root/.nix-profile/bin/mongosh'} "${mongoUri}" --quiet --eval ` +
    `'print(JSON.stringify({users:db.user.find({},{_id:1,uname:1,mail:1}).toArray(),activeUids:db.record.distinct("uid")}))'`,
)
const hydro = JSON.parse(hydroRaw.slice(hydroRaw.indexOf('{')))
const hydroUsers = hydro.users || []
const activeUids = new Set(hydro.activeUids || [])

// ---------- 2. 拉 LMS 用户 ----------
console.log('→ 读取 LMS 用户…')
if (!prodLine) {
  console.error('找不到生产库连接串：请在 .env 保留一行 #POSTGRES_URL=... 或用 --db 传入')
  process.exit(1)
}
const sql = postgres(getProdUrl(), { max: 1, idle_timeout: 5 })
let lmsUsers
try {
  lmsUsers = await sql`select id, username, email, name from users where deleted_at is null`
} finally {
  await sql.end({ timeout: 3 })
}

// ---------- 3. 建索引 ----------
const norm = (s) =>
  String(s || '')
    .toLowerCase()
    .replace(/[\s._\-()（）]/g, '')

// 通用名不做姓名兜底：这些词在两边都可能存在，猜错等于把管理权限绑给错的人。
// 必须用 --map 显式指定（例：--map 2:1 把 Hydro 的 admin 绑到 LMS 的 admin）。
const COMMON_NAMES = new Set(['admin', 'root', 'test', 'guest', 'hydro', 'system', 'user', 'student', 'teacher'])

const byEmail = new Map()
const byName = new Map()
for (const u of lmsUsers) {
  const mail = (u.email || '').trim().toLowerCase()
  if (mail) byEmail.set(mail, u)
  const n = norm(u.name || u.username)
  if (n) {
    if (!byName.has(n)) byName.set(n, [])
    byName.get(n).push(u)
  }
}

// ---------- 4. 匹配 ----------
const bindings = []
const manualNeeded = []
const conflicts = []
const claimedLms = new Map() // lmsId -> hydroUid

for (const h of hydroUsers) {
  if (h._id === 0) continue // Guest
  if (manual.has(h._id)) {
    bindings.push({ id: String(manual.get(h._id)), uid: h._id, via: 'manual' })
    claimedLms.set(manual.get(h._id), h._id)
    continue
  }

  const mail = (h.mail || '').trim().toLowerCase()
  let hit = mail && !mail.endsWith('@hydro.local') ? byEmail.get(mail) : null
  let via = hit ? 'email' : ''

  if (!hit) {
    // 通用名不猜（admin / root / test ...），交给 --map
    if (!COMMON_NAMES.has(String(h.uname || '').trim().toLowerCase())) {
      const candidates = byName.get(norm(h.uname)) || []
      if (candidates.length === 1) {
        hit = candidates[0]
        via = 'name'
      } else if (candidates.length > 1) {
        conflicts.push({ h, reason: `姓名命中 ${candidates.length} 个 LMS 用户，歧义` })
        continue
      }
    }
  }

  if (!hit) {
    manualNeeded.push(h)
    continue
  }

  // 一个 LMS 用户只能绑一个 Hydro 账号；email 命中优先
  const prev = claimedLms.get(hit.id)
  if (prev !== undefined) {
    if (via === 'email') {
      const idx = bindings.findIndex((b) => b.id === String(hit.id))
      if (idx > -1) bindings.splice(idx, 1)
      conflicts.push({ h, reason: `与 hydro uid=${prev} 抢同一个 LMS #${hit.id}，保留本次 email 命中` })
      bindings.push({ id: String(hit.id), uid: h._id, via })
      claimedLms.set(hit.id, h._id)
    } else {
      conflicts.push({ h, reason: `LMS #${hit.id} 已绑定给 hydro uid=${prev}` })
    }
    continue
  }

  bindings.push({ id: String(hit.id), uid: h._id, via })
  claimedLms.set(hit.id, h._id)
}

// ---------- 5. 报告 ----------
const pct = (a, b) => (b ? ((a / b) * 100).toFixed(1) + '%' : '-')
const viaEmail = bindings.filter((b) => b.via === 'email').length
const viaName = bindings.filter((b) => b.via === 'name').length
const viaManual = bindings.filter((b) => b.via === 'manual').length
const boundUids = new Set(bindings.map((b) => b.uid))
const activeBound = [...activeUids].filter((u) => boundUids.has(u)).length

console.log('\n================ 绑定预填报告 ================')
console.log(`Hydro 用户                : ${hydroUsers.length}`)
console.log(`LMS 有效用户              : ${lmsUsers.length}`)
console.log(`待写入绑定                : ${bindings.length}`)
console.log(`  email 命中              : ${viaEmail}`)
console.log(`  姓名兜底命中            : ${viaName}`)
console.log(`  手工指定                : ${viaManual}`)
console.log(`待人工处理                : ${manualNeeded.length + conflicts.length}`)
console.log(`    无任何命中            : ${manualNeeded.length}`)
console.log(`    冲突/歧义             : ${conflicts.length}`)
console.log(`Hydro 活跃用户覆盖         : ${activeBound}/${activeUids.size} (${pct(activeBound, activeUids.size)})`)

if (viaName) {
  console.log('\n--- 姓名兜底绑定的用户（请抽检）---')
  for (const b of bindings.filter((x) => x.via === 'name')) {
    const h = hydroUsers.find((u) => u._id === b.uid)
    console.log(`  ${h.uname} <${h.mail}>  →  lms#${b.id}`)
  }
}
if (manualNeeded.length) {
  console.log('\n--- 无命中，需手工 --map ---')
  for (const h of manualNeeded) {
    console.log(`  uid=${h._id}\t${h.uname}\t${h.mail}${activeUids.has(h._id) ? '\t(活跃)' : ''}`)
  }
}
if (conflicts.length) {
  console.log('\n--- 冲突/歧义（未写入）---')
  for (const c of conflicts) {
    console.log(`  uid=${c.h._id}\t${c.h.uname}\t${c.h.mail}\t${c.reason}`)
  }
}

if (!APPLY) {
  console.log('\n[dry] 未写入。确认无误后加 --apply 执行。')
  process.exit(0)
}

// ---------- 6. 写入 Hydro ----------
console.log('\n→ 写入 Hydro mongo oauth 集合…')
const payload = bindings.map((b) => ({ id: b.id, uid: b.uid }))
writeFileSync('/tmp/oauth-bindings.json', JSON.stringify(payload), 'utf8')
execFileSync('scp', ['-i', KEY, '-o', 'BatchMode=yes', '/tmp/oauth-bindings.json', `${HOST}:/tmp/oauth-bindings.json`])
execFileSync('scp', [
  '-i', KEY, '-o', 'BatchMode=yes',
  new URL('./hydro-addon/hydro-write-bindings.cjs', import.meta.url).pathname,
  `${HOST}:/tmp/hydro-write-bindings.cjs`,
])

const out = ssh(
  'NODE_PATH=/usr/local/share/.config/yarn/global/node_modules node /tmp/hydro-write-bindings.cjs /tmp/oauth-bindings.json --apply',
)
console.log(out.trim())
console.log('\n✅ 完成。建议立刻抽查 3 个用户：登录 Hydro → 点「校园账号登录」→ 确认是自己的旧账号（有历史提交记录）。')
