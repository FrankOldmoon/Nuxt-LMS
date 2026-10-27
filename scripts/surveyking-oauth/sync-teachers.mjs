#!/usr/bin/env node
/**
 * 把 LMS 的教师/管理员账号预置成 SurveyKing 账号，并绑定 OAuth 身份
 *
 * 为什么需要预置
 * --------------
 * SurveyKing 的第三方登录是「**先有账号、再绑身份**」：
 *   - 账号存在但没绑 → 走绑定流程（要在已登录状态下点设置里的绑定）
 *   - 什么都没绑 → 走注册流程（要填用户名密码，见 registerEnabled）
 * 预置等于把「首次登录时建号」这件事提前做完：
 *   老师第一次点「LMS 账号登录」→ LMS 授权 → 直接进系统，零表单。
 *
 * 绑定键：T_ACCOUNT.auth_type='GOOGLE' + auth_account = LMS users.id
 *   （SurveyKing 不按 email 匹配，auth_account 必须等于 id_token 的 sub）
 *
 * 生成的账号只有 GOOGLE 一种登录方式，**没有密码**，只能通过 LMS 登录。
 *
 * 用法：
 *   node scripts/surveyking-oauth/sync-teachers.mjs --role-id <surveykingRoleId> \
 *        --dept-id <surveykingDeptId> --out /tmp/sk-teachers.sql
 *   # 服务器上（需先停掉容器，H2 文件被锁）：
 *   bash sk-h2.sh file /tmp/sk-teachers.sql
 */

import { writeFileSync } from 'node:fs'
import postgres from 'postgres'
import { getProdUrl } from '../_prod-url.mjs'

function parseArgs(argv) {
  const args = { roleId: '', deptId: '', out: '', roles: ['teacher', 'admin', 'observer'] }
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i]
    if (a === '--role-id') args.roleId = argv[++i]
    else if (a === '--dept-id') args.deptId = argv[++i]
    else if (a === '--out') args.out = argv[++i]
    else if (a === '--roles') args.roles = argv[++i].split(',')
    else if (a === '--help' || a === '-h') args.help = true
  }
  return args
}

const args = parseArgs(process.argv.slice(2))
if (args.help || !args.roleId || !args.deptId || !args.out) {
  console.log(`用法:
  node scripts/surveyking-oauth/sync-teachers.mjs --role-id <skRoleId> --dept-id <skDeptId> --out <sql文件> [--roles teacher,admin]

说明：
  --role-id  SurveyKing 的角色 id（t_role.id），预置的账号都挂这个角色
  --dept-id  SurveyKing 的部门 id（t_dept.id）
  --roles    从 LMS 取哪些角色的用户，默认 teacher,admin,observer`)
  process.exit(args.help ? 0 : 1)
}

const sql = postgres(getProdUrl(), { max: 1, idle_timeout: 5 })
let users
try {
  users = await sql`
    select distinct u.id, u.username, u.name, u.email
    from users u
    join user_roles ur on ur.user_id = u.id
    join roles r on r.id = ur.role_id
    where u.deleted_at is null and r.code in ${sql(args.roles)}
    order by u.id
  `
} finally {
  await sql.end({ timeout: 3 })
}

// id 用数字串，落在与现有 snowflake 不同的号段，避免撞主键
const UID_BASE = 1780000000000000000n
const ACC_BASE = 1780001000000000000n
const REL_BASE = 1780002000000000000n

const esc = (s) => String(s ?? '').replace(/'/g, "''")
const lines = [
  '-- 由 scripts/surveyking-oauth/sync-teachers.mjs 生成',
  '-- 把 LMS 教师账号预置进 SurveyKing，并绑定 GOOGLE(=LMS users.id) 身份',
  `-- role_id=${args.roleId} dept_id=${args.deptId} 共 ${users.length} 人`,
  'begin;',
  '',
]

for (const u of users) {
  const uid = (UID_BASE + BigInt(u.id)).toString()
  const aid = (ACC_BASE + BigInt(u.id)).toString()
  const rid = (REL_BASE + BigInt(u.id)).toString()
  const name = (u.name || u.username || '').slice(0, 50)
  const email = (u.email || '').slice(0, 50)
  // 没有邮箱的账号留空（T_USER.email 可空）；SurveyKing 登录不依赖邮箱
  lines.push(
    `-- LMS #${u.id} ${u.username} ${name}`,
    `INSERT INTO t_user (id, name, dept_id, email, status, is_deleted, create_at)`,
    `SELECT '${uid}', '${esc(name)}', '${esc(args.deptId)}', '${esc(email)}', 1, 0, CURRENT_TIMESTAMP`,
    // 已经绑过这个 LMS 身份的（如 Frank 已绑到管理员账号）就跳过，别造重复用户
    `WHERE NOT EXISTS (SELECT 1 FROM t_user WHERE id = '${uid}')`,
    `  AND NOT EXISTS (SELECT 1 FROM t_account WHERE auth_type = 'GOOGLE' AND auth_account = '${u.id}');`,
    '',
    `INSERT INTO t_account (id, user_type, user_id, auth_type, auth_account, status, is_deleted, create_at)`,
    `SELECT '${aid}', 'SysUser', '${uid}', 'GOOGLE', '${u.id}', 1, 0, CURRENT_TIMESTAMP`,
    `WHERE NOT EXISTS (SELECT 1 FROM t_account WHERE auth_type = 'GOOGLE' AND auth_account = '${u.id}');`,
    '',
    `INSERT INTO t_user_role (id, user_type, user_id, role_id, create_at)`,
    `SELECT '${rid}', 'SysUser', '${uid}', '${esc(args.roleId)}', CURRENT_TIMESTAMP`,
    // 用户没建成（已绑到别的账号）就别插角色关系，避免悬空行
    `WHERE NOT EXISTS (SELECT 1 FROM t_user_role WHERE user_id = '${uid}' AND role_id = '${esc(args.roleId)}')`,
    `  AND EXISTS (SELECT 1 FROM t_user WHERE id = '${uid}');`,
    '',
  )
}
lines.push('commit;', '')

writeFileSync(args.out, lines.join('\n'))
console.log(`已生成 ${args.out}：${users.length} 个 LMS 账号`)
for (const u of users) {
  console.log(`  LMS #${u.id} ${u.username} ${u.name}${u.email ? ' <' + u.email + '>' : ' (无邮箱)'}`)
}
