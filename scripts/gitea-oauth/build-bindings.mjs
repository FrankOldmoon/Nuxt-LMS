#!/usr/bin/env node
/**
 * 生成 Gitea ⇄ LMS 的账号绑定表（external_login_user 的 INSERT 语句）
 *
 * 为什么不能像 Hydro 那样按 email 认领：
 *   Gitea 里 1029/1030 个账号的 email 是占位符 `<学号>@students.local`，
 *   和 LMS 的真实邮箱对不上，只能按「学号 = 用户名」匹配。
 *
 * Gitea 的登录查找顺序（routers/web/auth/oauth.go → oAuth2UserLoginCallback）：
 *   ① users 表 login_source + login_name（只在 OAuth 自动注册时写入）
 *   ② external_login_user 表 (login_source_id, external_id)   ← 本脚本写这里
 *   ③ 都没命中 → 因为 ENABLE_AUTO_REGISTRATION=false，弹「关联已有账号」页
 *      —— 而那时密码登录已经关掉，等于登不进去，所以必须先把绑定写全。
 *
 * external_id 必须是 id_token / userinfo 的 sub，也就是 LMS users.id 的字符串。
 *
 * 用法：
 *   node scripts/gitea-oauth/build-bindings.mjs --users /tmp/gitea_users.csv --source-id 1
 *   node scripts/gitea-oauth/build-bindings.mjs --users /tmp/gitea_users.csv --source-id 1 --sql out.sql
 *
 * 默认只打印报告；--sql 输出可执行 SQL，--apply 需要额外确认（本脚本刻意不直连 Gitea 库）。
 */

import { readFileSync, writeFileSync } from 'node:fs'
import postgres from 'postgres'

function parseArgs(argv) {
  const args = { users: '', sourceId: 0, sql: '', map: [], extra: [] }
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i]
    if (a === '--users') args.users = argv[++i]
    else if (a === '--source-id') args.sourceId = Number(argv[++i])
    else if (a === '--sql') args.sql = argv[++i]
    else if (a === '--map') args.map.push(argv[++i]) // giteaId:lmsId 覆盖主绑定
    else if (a === '--extra') args.extra.push(argv[++i]) // lmsId:giteaId 附加绑定
    else if (a === '--help' || a === '-h') args.help = true
  }
  return args
}

const args = parseArgs(process.argv.slice(2))
if (args.help || !args.users || !args.sourceId) {
  console.log(`用法:
  node scripts/gitea-oauth/build-bindings.mjs --users /tmp/gitea_users.csv --source-id <login_source.id> [--sql out.sql] [--map 12:34] [--extra 34:12]

参数:
  --users      gitea 侧导出的 CSV：id,lower_name,email,is_admin,is_active,...
  --source-id  login_source 表里新建那条 oauth2 source 的 id
  --sql        输出 SQL 文件路径
  --map        giteaUserId:lmsUserId，覆盖自动匹配（可重复）
  --extra      lmsUserId:giteaUserId，给同一个 gitea 账号追加一个 LMS 身份（可重复）`)
  process.exit(args.help ? 0 : 1)
}

// ---------- 1. 读 gitea 用户 ----------
const giteaUsers = readFileSync(args.users, 'utf8')
  .split('\n')
  .map((l) => l.trim())
  .filter((l) => /^\d+,/.test(l))
  .map((l) => {
    const [id, lowerName, email, isAdmin, isActive] = l.split(',')
    return { id: Number(id), lowerName, email, isAdmin: isAdmin === 't', isActive: isActive === 't' }
  })

// ---------- 2. 读 LMS 用户 ----------
const env = readFileSync(new URL('../../.env', import.meta.url), 'utf8')
const prodLine = env.split('\n').find((l) => /^#\s*POSTGRES_URL=/.test(l))
if (!prodLine) {
  console.error('❌ .env 里找不到注释掉的生产库连接串（#POSTGRES_URL=...）')
  process.exit(1)
}
const sql = postgres(prodLine.replace(/^#\s*POSTGRES_URL=/, '').trim(), { max: 1, idle_timeout: 5 })

let lmsUsers
try {
  lmsUsers = await sql`
    select id, username, name, email
    from users
    where deleted_at is null
  `
} finally {
  await sql.end({ timeout: 3 })
}

const byUsername = new Map()
for (const u of lmsUsers) {
  if (!u.username) continue
  const key = String(u.username).toLowerCase()
  if (!byUsername.has(key)) byUsername.set(key, [])
  byUsername.get(key).push(u)
}

// ---------- 3. 匹配 ----------
const matched = [] // { gitea, lms }
const unmatched = []
const usedLms = new Map() // lmsId -> gitea

for (const g of giteaUsers) {
  const hits = byUsername.get(g.lowerName) || []
  if (hits.length === 1) {
    if (usedLms.has(hits[0].id)) {
      unmatched.push({ g, reason: `LMS #${hits[0].id} 已被 gitea #${usedLms.get(hits[0].id)} 占用` })
      continue
    }
    usedLms.set(hits[0].id, g.id)
    matched.push({ g, lms: hits[0] })
  } else if (hits.length > 1) {
    unmatched.push({ g, reason: `LMS 侧同名 ${hits.length} 条：${hits.map((h) => `#${h.id}`).join(',')}` })
  } else {
    unmatched.push({ g, reason: 'LMS 无同名账号' })
  }
}

// ---------- 4. 手工补 ----------
for (const pair of args.map) {
  const [gid, lid] = pair.split(':').map(Number)
  const g = giteaUsers.find((x) => x.id === gid)
  const lms = lmsUsers.find((x) => x.id === lid)
  if (!g || !lms) {
    console.error(`⚠️  --map ${pair} 无效：gitea=${!!g} lms=${!!lms}`)
    continue
  }
  const idx = unmatched.findIndex((u) => u.g.id === gid)
  if (idx >= 0) unmatched.splice(idx, 1)
  const prev = matched.findIndex((m) => m.g.id === gid)
  if (prev >= 0) matched.splice(prev, 1)
  matched.push({ g, lms })
}

// ---------- 4b. 附加绑定（同一个 gitea 账号再接受另外一个 LMS 身份）----------
// 例：gitea `frank` 主绑 LMS `Frank Hu`(#32)，再额外接受 LMS `admin`(#1)。
// external_login_user 的主键是 (external_id, login_source_id)，所以一个 gitea 用户
// 可以挂多条，登录时任一条命中即可。
for (const pair of args.extra) {
  const [lid, gid] = pair.split(':').map(Number)
  const g = giteaUsers.find((x) => x.id === gid)
  const lms = lmsUsers.find((x) => x.id === lid)
  if (!g || !lms) {
    console.error(`⚠️  --extra ${pair} 无效：gitea=${!!g} lms=${!!lms}`)
    continue
  }
  matched.push({ g, lms })
}

// ---------- 5. 报告 ----------
console.log(`gitea 用户 : ${giteaUsers.length}`)
console.log(`LMS 用户   : ${lmsUsers.length}`)
console.log(`已匹配     : ${matched.length}`)
console.log(`未匹配     : ${unmatched.length}`)
console.log('')

const admins = matched.filter((m) => m.g.isAdmin)
console.log(`管理员绑定 : ${admins.map((m) => `${m.g.lowerName}(gitea#${m.g.id})→LMS#${m.lms.id}`).join(', ') || '（无）'}`)
console.log('')

if (unmatched.length) {
  console.log('--- 未匹配明细 ---')
  for (const u of unmatched) {
    console.log(`gitea#${u.g.id} ${u.g.lowerName.padEnd(18)} admin=${u.g.isAdmin ? 'Y' : 'n'} email=${u.g.email}  ← ${u.reason}`)
  }
  console.log('')
}

// ---------- 6. 输出 SQL ----------
if (args.sql) {
  const esc = (s) => String(s ?? '').replace(/'/g, "''")
  const rows = matched.map(({ g, lms }) => `  ('${esc(lms.id)}', ${g.id}, ${args.sourceId}, 'lms', '${esc(lms.email)}', '${esc(lms.name)}', '${esc(lms.username)}')`)
  const out = `-- 由 scripts/gitea-oauth/build-bindings.mjs 生成
-- external_id = LMS users.id（id_token/userinfo 的 sub）
-- login_source_id = ${args.sourceId}
begin;

insert into external_login_user
  (external_id, user_id, login_source_id, provider, email, name, nick_name)
values
${rows.join(',\n')}
on conflict (external_id, login_source_id) do update
  set user_id = excluded.user_id;

commit;
`
  writeFileSync(args.sql, out)
  console.log(`✅ SQL 已写入 ${args.sql}（${matched.length} 条）`)
}
