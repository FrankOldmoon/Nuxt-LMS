#!/usr/bin/env node
/**
 * 对生产库执行一个 SQL 迁移文件（谨慎使用）
 *
 * 用法：
 *   node scripts/apply-sql.mjs server/db/migrations/postgresql/0006_xxx.sql --dry
 *   node scripts/apply-sql.mjs server/db/migrations/postgresql/0006_xxx.sql --apply
 *
 * 连接串取 .env 里被注释的那行（#POSTGRES_URL=... 指向 10.28.1.151 生产库）。
 * 只做「新增」，本脚本不会 drop 任何东西 —— 但执行前请自己确认 SQL 内容。
 */

import { readFileSync } from 'node:fs'
import postgres from 'postgres'

const file = process.argv[2]
const apply = process.argv.includes('--apply')

if (!file) {
  console.error('用法: node scripts/apply-sql.mjs <sql文件> [--dry|--apply]')
  process.exit(1)
}

const env = readFileSync(new URL('../.env', import.meta.url), 'utf8')
const prod = env.split('\n').find((l) => /^#\s*POSTGRES_URL=/.test(l))
if (!prod) {
  console.error('找不到生产库连接串（.env 里需要一行 #POSTGRES_URL=...）')
  process.exit(1)
}
const url = prod.replace(/^#\s*POSTGRES_URL=/, '').trim()
const sqlText = readFileSync(file, 'utf8')

if (!apply) {
  const stmts = sqlText.split('--> statement-breakpoint').filter((s) => s.trim())
  console.log(`[dry] ${file}`)
  console.log(`[dry] 共 ${stmts.length} 条语句：`)
  stmts.forEach((s, i) => console.log(`  ${i + 1}. ${s.trim().split('\n')[0].slice(0, 90)}`))
  console.log('[dry] 未执行')
  process.exit(0)
}

const sql = postgres(url, { max: 1, idle_timeout: 5 })
try {
  await sql.unsafe(sqlText)
  console.log(`✅ 已执行 ${file}`)
  const tables = await sql`
    select table_name from information_schema.tables
    where table_schema = 'public' and table_name in ('oauth_clients','oauth_codes')
    order by table_name
  `
  console.log('校验:', tables.map((t) => t.table_name).join(', ') || '（没查到表！）')
} finally {
  await sql.end({ timeout: 3 })
}
