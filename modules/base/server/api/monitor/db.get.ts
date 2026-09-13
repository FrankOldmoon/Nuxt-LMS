/**
 * 监控页：数据库运行状态
 * 连接健康度、延迟、版本、库大小、连接数、各表大小与行数
 */
import { db } from '@nuxthub/db'
import { sql } from 'drizzle-orm'
import { assertMonitorPassword } from '../../utils/monitor'

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig(event)
  assertMonitorPassword(event, config.monitor?.viewPassword || '')

  const start = performance.now()
  try {
    const [version, dbSize, conns, tables] = await Promise.all([
      db.execute(sql`select current_setting('server_version') as v`),
      db.execute(sql`select pg_database_size(current_database()) as size`),
      db.execute(
        sql`select count(*)::int as n from pg_stat_activity where datname = current_database()`,
      ),
      db.execute(sql`
        select
          t.relname as table_name,
          t.n_live_tup as rows,
          pg_size_pretty(pg_total_relation_size(c.oid)) as size
        from pg_class c
        join pg_stat_user_tables t on t.relid = c.oid
        where c.relkind = 'r'
        order by pg_total_relation_size(c.oid) desc
      `),
    ])

    return cResp({
      ok: true,
      type: 'postgresql',
      latencyMs: Math.round(performance.now() - start),
      version: String(version[0]?.v ?? ''),
      databaseSize: Number(dbSize[0]?.size ?? 0),
      activeConnections: Number(conns[0]?.n ?? 0),
      tables: (tables as any[]).map((t) => ({
        name: String(t.table_name),
        rows: Number(t.rows ?? 0),
        size: String(t.size ?? '0 bytes'),
      })),
      checkedAt: new Date().toISOString(),
    })
  } catch (e: any) {
    return cResp({
      ok: false,
      error: String(e?.message || e),
      latencyMs: Math.round(performance.now() - start),
      checkedAt: new Date().toISOString(),
    })
  }
})
