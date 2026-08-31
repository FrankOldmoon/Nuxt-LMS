/**
 * 批量替换 chapters.content（jsonb 富文本）中的文本 IP 地址。
 *
 * 用法：
 *   node scripts/replace_chapter_ip.mjs               # 仅 dry-run，统计并列出匹配章节
 *   node scripts/replace_chapter_ip.mjs --apply       # 真正执行替换
 *
 * 可用环境变量覆盖：
 *   POSTGRES_URL  数据库连接串（默认读取项目根目录 .env 中的 POSTGRES_URL）
 *   REPLACE_FROM  要替换的旧文本（默认 10.21.1.1）
 *   REPLACE_TO    替换成的新文本（默认 10.22.22.2）
 *
 * 说明：FROM/TO 仅含数字与点号，属于 JSON 普通字符，替换不会破坏 jsonb 结构；
 *       ip 替换可能命中其前缀（如 10.21.1.1 → 10.21.1.10 中的为 10.22.22.20），若需整段精确匹配请自行改脚本。
 */
import { readFileSync, existsSync } from 'node:fs'
import { resolve } from 'node:path'
import postgres from 'postgres'

// —— 解析数据库连接串：优先进程环境变量，其次项目根目录 .env ——
function loadPostgresUrl() {
  if (process.env.POSTGRES_URL) return process.env.POSTGRES_URL
  const envPath = resolve(process.cwd(), '.env')
  if (!existsSync(envPath)) {
    throw new Error('未找到 POSTGRES_URL 环境变量或项目根目录的 .env 文件')
  }
  const line = readFileSync(envPath, 'utf8')
    .split('\n')
    .find((l) => l.startsWith('POSTGRES_URL='))
  if (!line) throw new Error('.env 中未配置 POSTGRES_URL')
  return line.slice('POSTGRES_URL='.length).trim().replace(/^["']|["']$/g, '')
}

const TABLE = 'chapters'
const COLUMN = 'content'
const FROM = process.env.REPLACE_FROM || '10.21.1.1'
const TO = process.env.REPLACE_TO || '10.22.22.2'
const APPLY = process.argv.includes('--apply')

const sql = postgres(loadPostgresUrl())

/** 统计受影响行数与出现次数 */
async function countOcc() {
  const rows = await sql`
    SELECT
      count(*)::int AS affected_rows,
      COALESCE(sum(
        (length(${sql(COLUMN)}::text) - length(replace(${sql(COLUMN)}::text, ${FROM}, ''))) / length(${FROM})
      ), 0)::int AS occurrences
    FROM ${sql(TABLE)}
    WHERE ${sql(COLUMN)}::text LIKE ${'%' + FROM + '%'}
  `
  const row = rows[0]
  return { affectedRows: Number(row.affected_rows), occurrences: Number(row.occurrences) }
}

async function main() {
  console.log(`目标 ${TABLE}.${COLUMN}（jsonb）| 替换 "${FROM}" -> "${TO}" | 模式: ${APPLY ? 'APPLY（会写入）' : 'DRY-RUN（仅统计）'}`)

  const before = await countOcc()
  console.log(`替换前: 受影响 ${before.affectedRows} 行，共 ${before.occurrences} 处`)

  if (!APPLY) {
    const matched = await sql`
      SELECT id, name FROM ${sql(TABLE)}
      WHERE ${sql(COLUMN)}::text LIKE ${'%' + FROM + '%'}
      ORDER BY id LIMIT 50
    `
    if (matched.length === 0) {
      console.log('未匹配到任何章节。')
    } else {
      console.log(`匹配章节（前 ${matched.length} 条）：`)
      for (const m of matched) console.log(`  #${m.id}  ${m.name}`)
    }
  } else {
    const result = await sql`
      UPDATE ${sql(TABLE)}
      SET ${sql(COLUMN)} = replace(${sql(COLUMN)}::text, ${FROM}, ${TO})::jsonb
      WHERE ${sql(COLUMN)}::text LIKE ${'%' + FROM + '%'}
    `
    console.log(`已更新 ${result.count} 行`)
    const after = await countOcc()
    console.log(`替换后: 受影响 ${after.affectedRows} 行，共 ${after.occurrences} 处（应均为 0）`)
  }

  await sql.end()
}

main().catch((err) => {
  console.error('执行失败:', err?.message || err)
  process.exit(1)
})