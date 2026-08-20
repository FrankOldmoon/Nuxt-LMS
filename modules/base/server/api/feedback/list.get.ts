import { db, schema } from '@nuxthub/db'
import { eq, desc, isNull, sql } from 'drizzle-orm'

/**
 * 管理员查看用户反馈（分页）
 * GET /api/feedback/list?page=1&pageSize=10
 *
 * 权限：管理员。返回 feedback + 提交用户名，按创建时间倒序。
 * 供 Feedback 弹窗的管理员视图使用（只读分页列表，无新增表单）。
 */
export default eventHandler(async (event) => {
  await requireRole(event, ['admin'])

  const query = getQuery(event)
  const page = Math.max(1, Number(query.page) || 1)
  const pageSize = Math.min(100, Math.max(1, Number(query.pageSize) || 10))

  const [totalRows, rows] = await Promise.all([
    db
      .select({ count: sql<number>`count(*)::int` })
      .from(schema.feedbacks)
      .where(isNull(schema.feedbacks.deletedAt)),
    db
      .select({
        id: schema.feedbacks.id,
        name: schema.feedbacks.name,
        type: schema.feedbacks.type,
        content: schema.feedbacks.content,
        userId: schema.feedbacks.userId,
        userName: schema.users.name,
        createdAt: schema.feedbacks.createdAt,
      })
      .from(schema.feedbacks)
      .leftJoin(schema.users, eq(schema.feedbacks.userId, schema.users.id))
      .where(isNull(schema.feedbacks.deletedAt))
      .orderBy(desc(schema.feedbacks.createdAt))
      .limit(pageSize)
      .offset((page - 1) * pageSize),
  ])

  return cResp({ data: rows, total: totalRows[0]?.count || 0 })
})
