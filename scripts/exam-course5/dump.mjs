/**
 * 把 course 5 的题目导出成 JSON（供出卷脚本挑选/改造）
 */
import { writeFileSync } from 'node:fs'
import postgres from 'postgres'
import { getProdUrl } from '../_prod-url.mjs'

const sql = postgres(getProdUrl(), { max: 1 })
const rows = await sql`
  select cid, type, name, content, options, answer, explanation
  from questions where course_id = 5 and deleted_at is null order by type, cid`
await sql.end()
writeFileSync(new URL('./course5-questions.json', import.meta.url), JSON.stringify(rows, null, 2))
console.log('导出', rows.length, '题')
for (const t of [...new Set(rows.map(r => r.type))]) {
  console.log(' ', t, rows.filter(r => r.type === t).length)
}
