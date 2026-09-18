/**
 * 回填历史作业的提交时间：为 user_homeworks 记录补写 record._submittedAt
 *
 * 背景：
 *   提交时间 _submittedAt 是后加到「提交」流程里的字段
 *   （见 modules/lms/server/api/homeworks/submit.post.ts）。
 *   本次改造之前的历史提交记录里没有该字段，教师端评阅详情只能回退显示行创建时间。
 *   本脚本把该时间显式写回记录，便于后续统计与展示。
 *
 * 取值策略：
 *   历史数据无法精确还原「最后一次提交」时刻，脚本统一取该行的 created_at（首次落库时间）
 *   作为近似提交时间。注意边界：若学生「先提交 → 教师批改 → 再重交」，created_at 是首次
 *   提交时间而非最后一次（updated_at 也可能被批改刷新，同样不可靠）。
 *
 * 筛选范围：
 *   只处理 record 不为空（即学生真实提交过）且尚未写 _submittedAt、且未被软删除的记录；
 *   教师「仅评分/仅评语」产生的记录（record 为空）会被跳过。
 *
 * 用法：
 *   POSTGRES_URL=postgresql://user:pass@host:5432/db node scripts/backfill-homework-submitted-at.mjs
 *   node scripts/backfill-homework-submitted-at.mjs --url <PostgresURL> --dry-run
 *
 * 选项：
 *   --url <url>   数据库连接串（缺省读取环境变量 POSTGRES_URL）
 *   --dry-run     只统计与预览，不写库
 *   --limit <n>   仅处理前 n 条（调试用）
 *
 * 安全：写库前会把命中的原记录备份到 storage/backups/ 下的 JSON 文件。
 */
import postgres from 'postgres'
import fs from 'node:fs'
import path from 'node:path'

function parseArgs(argv) {
  const args = {
    url: process.env.POSTGRES_URL || '',
    dryRun: false,
    limit: 0,
    backupDir: path.join(process.cwd(), 'storage', 'backups'),
  }
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i]
    if (a === '--dry-run') args.dryRun = true
    else if (a === '--url') args.url = argv[++i]
    else if (a === '--limit') args.limit = Number(argv[++i]) || 0
  }
  return args
}

function toIso(value) {
  if (!value) return null
  const d = new Date(value)
  return Number.isNaN(d.getTime()) ? null : d.toISOString()
}

const args = parseArgs(process.argv.slice(2))
if (!args.url) {
  console.error('✗ 缺少数据库连接串：请设置环境变量 POSTGRES_URL 或传 --url <url>')
  process.exit(1)
}

const sql = postgres(args.url, { max: 1, connect_timeout: 10 })

try {
  const limitClause = args.limit > 0 ? sql`limit ${args.limit}` : sql``
  const rows = await sql`
    select user_id, course_id, homework_cid, created_at, updated_at, record
    from user_homeworks
    where record is not null
      and (record->>'_submittedAt') is null
      and deleted_at is null
    order by created_at asc
    ${limitClause}
  `

  console.log(`待回填记录：${rows.length} 条`)
  if (rows.length === 0) {
    console.log('无需处理')
  } else {
    // 写库前备份原记录
    fs.mkdirSync(args.backupDir, { recursive: true })
    const backupFile = path.join(args.backupDir, `homework_submitted_at_backup_${Date.now()}.json`)
    fs.writeFileSync(
      backupFile,
      JSON.stringify(
        rows.map(r => ({
          user_id: r.user_id,
          course_id: r.course_id,
          homework_cid: r.homework_cid,
          created_at: r.created_at,
          record: r.record,
        })),
        null,
        2,
      ),
    )
    console.log(`已备份原记录到：${backupFile}`)

    if (args.dryRun) {
      rows.slice(0, 10).forEach((r) => {
        console.log(`  [dry] u=${r.user_id} c=${r.course_id} hw=${r.homework_cid} → ${toIso(r.created_at)}`)
      })
      if (rows.length > 10) console.log(`  ... 其余 ${rows.length - 10} 条略`)
      console.log('dry-run 结束，未写库')
    } else {
      let ok = 0
      for (const r of rows) {
        const submittedAt = toIso(r.created_at)
        if (!submittedAt) continue
        const nextRecord = {
          ...(r.record && typeof r.record === 'object' && !Array.isArray(r.record) ? r.record : {}),
          _submittedAt: submittedAt,
        }
        await sql`
          update user_homeworks
          set record = ${sql.json(nextRecord)}
          where user_id = ${r.user_id}
            and course_id = ${r.course_id}
            and homework_cid = ${r.homework_cid}
        `
        ok++
      }
      console.log(`回填完成：${ok} 条`)
    }
  }
} catch (err) {
  console.error('✗ 执行失败：', err?.message || err)
  process.exitCode = 1
} finally {
  await sql.end()
}
