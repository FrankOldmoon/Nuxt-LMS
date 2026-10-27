#!/usr/bin/env node
/**
 * 生成一个 OAuth client（供外部系统接入 LMS 登录用）
 *
 * 用法：
 *   node scripts/create-oauth-client.mjs --name "Hydro OJ" \
 *        --redirect "http://10.28.1.155/oauth/lms/callback"
 *
 * 可重复 --redirect 传多个回调地址（精确匹配，不写通配）。
 *
 * 脚本只打印 SQL，不连库 —— 避免误写生产。生成的 secret 只显示一次，
 * 要立刻填进对方系统的配置（Hydro 侧是 lms-oauth.secret）。
 */

import { randomBytes, scrypt } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { promisify } from 'node:util'
import postgres from 'postgres'
import { getProdUrl } from './_prod-url.mjs'

const scryptAsync = promisify(scrypt)

// 必须与 modules/base/server/utils/auth/password.ts 的 hashPassword 保持一致
const SALT_LENGTH = 16
const KEY_LENGTH = 64

async function hashPassword(password) {
  const salt = randomBytes(SALT_LENGTH).toString('hex')
  const key = await scryptAsync(password, salt, KEY_LENGTH)
  return `${salt}:${key.toString('hex')}`
}

function parseArgs(argv) {
  const args = { name: '', redirects: [] }
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i]
    if (a === '--name') args.name = argv[++i]
    else if (a === '--redirect') args.redirects.push(argv[++i])
    else if (a === '--help' || a === '-h') args.help = true
  }
  return args
}

const args = parseArgs(process.argv.slice(2))

if (args.help || !args.name || !args.redirects.length) {
  console.log(`用法:
  node scripts/create-oauth-client.mjs --name "Hydro OJ" --redirect "http://10.28.1.155/oauth/lms/callback"

参数:
  --name      系统名称，写进 oauth_clients.name
  --redirect  回调地址，可重复传多个（必须与对方发起授权时的 redirect_uri 完全一致）`)
  process.exit(args.help ? 0 : 1)
}

const clientId = `lms_${randomBytes(8).toString('hex')}`
const clientSecret = randomBytes(24).toString('hex')
const secretHash = await hashPassword(clientSecret)

const esc = (s) => String(s).replace(/'/g, "''")
const urisJson = JSON.stringify(args.redirects)

console.log('')
console.log('=========== OAuth client 已生成 ===========')
console.log(`name          : ${args.name}`)
console.log(`client_id     : ${clientId}`)
console.log(`client_secret : ${clientSecret}`)
console.log(`redirect_uris : ${urisJson}`)
console.log('')
console.log('⚠️  client_secret 只在这里显示一次，请立刻填入对方系统配置。')
console.log('')
console.log('--- 在 LMS 生产库执行 ---')
console.log(`INSERT INTO oauth_clients (client_id, client_secret, name, redirect_uris)
VALUES ('${esc(clientId)}', '${esc(secretHash)}', '${esc(args.name)}', '${esc(urisJson)}'::jsonb)
ON CONFLICT (client_id) DO NOTHING;`)
console.log('')
console.log('--- Hydro 侧对应配置 ---')
console.log(`lms-oauth.id     = ${clientId}`)
console.log(`lms-oauth.secret = ${clientSecret}`)
console.log('')

if (process.argv.includes('--apply')) {
  const sql = postgres(getProdUrl(), { max: 1, idle_timeout: 5 })
  try {
    const rows = await sql`
      insert into oauth_clients (client_id, client_secret, name, redirect_uris)
      values (${clientId}, ${secretHash}, ${args.name}, ${sql.json(args.redirects)})
      on conflict (client_id) do nothing
      returning client_id
    `
    console.log(rows.length ? '✅ 已写入生产库 oauth_clients' : '⚠️ client_id 已存在，未写入')
  } finally {
    await sql.end({ timeout: 3 })
  }
} else {
  console.log('（未写库。加 --apply 直接写入生产库）')
  console.log('')
}
