import { db, schema } from '@nuxthub/db'
import { desc, eq, isNull, sql } from 'drizzle-orm'

/**
 * 广播通知阅读率（两层方案的统计入口）
 * GET /api/admin/broadcasts?limit=30
 *
 * 每条广播：送达数 = 明细行数，已读数 = readAt 非空的明细行数，阅读率 = 已读 / 送达。
 * 明细行不会因已读被删除，故统计口径稳定。
 */
export default eventHandler(async (event) => {
  await requireAdmin(event)

  const limit = Math.min(100, Math.max(1, Number(getQuery(event).limit) || 30))

  const rows: any[] = await db
    .select({
      id: schema.broadcasts.id,
      name: schema.broadcasts.name,
      content: schema.broadcasts.content,
      audience: schema.broadcasts.audience,
      createdBy: schema.broadcasts.createdBy,
      createdAt: schema.broadcasts.createdAt,
      delivered: sql`count(${schema.notifys.id})`.as('delivered'),
      readCount: sql`count(${schema.notifys.readAt})`.as('read_count'),
    })
    .from(schema.broadcasts)
    .leftJoin(schema.notifys, eq(schema.notifys.broadcastId, schema.broadcasts.id))
    .where(isNull(schema.broadcasts.deletedAt))
    .groupBy(
      schema.broadcasts.id,
      schema.broadcasts.name,
      schema.broadcasts.content,
      schema.broadcasts.audience,
      schema.broadcasts.createdBy,
      schema.broadcasts.createdAt,
    )
    .orderBy(desc(schema.broadcasts.createdAt))
    .limit(limit)

  const items = rows.map((r) => {
    const delivered = Number(r.delivered) || 0
    const readCount = Number(r.readCount) || 0
    return {
      id: Number(r.id),
      name: String(r.name || ''),
      text: String(r.content?.text || ''),
      audience: Number(r.audience) || 0,
      delivered,
      readCount,
      readRate: delivered > 0 ? Math.round((readCount / delivered) * 1000) / 10 : 0,
      createdAt: r.createdAt,
    }
  })

  return cResp({ items })
})
