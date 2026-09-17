import { db, schema } from '@nuxthub/db'
import { eq, desc, and, sql, inArray } from 'drizzle-orm'

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
      broadcastId: schema.notifys.broadcastId,
      readAt: schema.notifys.readAt,
      createdAt: schema.notifys.createdAt,
    })
    .from(schema.notifys)
    .where(baseWhere)
    .orderBy(desc(schema.notifys.createdAt))
    .limit(pageSize)
    .offset(offset)

  // 本页未读通知的「读后」处理：
  // - 广播明细（broadcastId 非空）：写 readAt 保留，供管理员统计阅读率
  // - 个人定向通知（broadcastId 为空，如作业评分 / 评论过审）：读后直接硬删除
  const unread = items.filter(i => !i.readAt)
  const broadcastIds = unread.filter(i => i.broadcastId != null).map(i => i.id)
  const personalIds = unread.filter(i => i.broadcastId == null).map(i => i.id)

  if (broadcastIds.length > 0) {
    await db.update(schema.notifys)
      .set({ readAt: new Date() })
      .where(and(
        eq(schema.notifys.userId, user.id),
        inArray(schema.notifys.id, broadcastIds),
      ))
  }
  if (personalIds.length > 0) {
    await db.delete(schema.notifys)
      .where(and(
        eq(schema.notifys.userId, user.id),
        inArray(schema.notifys.id, personalIds),
      ))
  }

  return cResp({ items, total, page, pageSize })
})
