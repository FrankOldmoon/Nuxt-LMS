import { db, schema } from '@nuxthub/db'
import { eq, desc, and, sql } from 'drizzle-orm'

export default eventHandler(async (event) => {
  const user = await requireAuth(event)

  const page = Math.max(1, Number(getQuery(event).page) || 1)
  const pageSize = Math.min(100, Math.max(1, Number(getQuery(event).pageSize) || 10))
  const offset = (page - 1) * pageSize

  const baseWhere = and(
    eq(schema.notifys.userId, user.id),
  )

  // 查询总数
  const countResult = await db
    .select({ count: sql<number>`COUNT(*)` })
    .from(schema.notifys)
    .where(baseWhere)

  const total = countResult[0]?.count ?? 0

  // 分页查询通知列表，按创建时间倒序
  const items = await db
    .select({
      id: schema.notifys.id,
      name: schema.notifys.name,
      content: schema.notifys.content,
      data: schema.notifys.data,
      userId: schema.notifys.userId,
      readAt: schema.notifys.readAt,
      createdAt: schema.notifys.createdAt,
    })
    .from(schema.notifys)
    .where(baseWhere)
    .orderBy(desc(schema.notifys.createdAt))
    .limit(pageSize)
    .offset(offset)

  // 标记本页未读通知为已读
  const unreadIds = items.filter(i => !i.readAt).map(i => i.id)
  if (unreadIds.length > 0) {
    await db.update(schema.notifys)
      .set({ readAt: new Date() })
      .where(and(
        eq(schema.notifys.userId, user.id),
        sql`${schema.notifys.id} IN (${sql.join(unreadIds.map(id => sql`${id}`), sql`,`)})`,
      ))
  }

  return cResp({ items, total, page, pageSize })
})
