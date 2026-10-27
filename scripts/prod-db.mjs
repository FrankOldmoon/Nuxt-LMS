#!/usr/bin/env node
/**
 * 固定连 LMS 生产库的小工具
 *
 * 为什么不用 `.env` 里注释掉的那一行：
 *   那行的注释状态会被随手改（有人把生产串挪到未注释行），按“有没有 #”判断会连错库。
 *   这里按**地址**判断：只要包含 10.28.1.151 就是生产库。
 *
 * 用法：
 *   node scripts/prod-db.mjs "select count(*) from users where deleted_at is null"
 *   node scripts/prod-db.mjs --file /tmp/q.sql
 */

import { readFileSync } from 'node:fs'
import postgres from 'postgres'

const env = readFileSync(new URL('../.env', import.meta.url), 'utf8')
const prod = env
  .split('\n')
  .map((l) => l.replace(/^#\s*/, '').trim())
  .find((l) => l.startsWith('POSTGRES_URL=') && l.includes('10.28.1.151'))

if (!prod) {
  console.error('❌ .env 里找不到指向 10.28.1.151 的 POSTGRES_URL')
  process.exit(1)
}

const url = prod.replace(/^POSTGRES_URL=/, '')
const sql = postgres(url, { max: 1, idle_timeout: 5 })

const args = process.argv.slice(2)
let query = ''
if (args[0] === '--file') {
  query = readFileSync(args[1], 'utf8')
} else {
  query = args.join(' ')
}

try {
  const rows = await sql.unsafe(query)
  console.table(rows)
} finally {
  await sql.end({ timeout: 3 })
}
