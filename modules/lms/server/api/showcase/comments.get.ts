/**
 * 作品评论列表
 * GET /api/showcase/comments?id=
 * 返回嵌套树：顶层评论 + children 回复，均按时间倒序
 */
import { db, schema } from '@nuxthub/db'
import { eq, and, isNull, inArray } from 'drizzle-orm'

export default eventHandler(async (event) => {
  const showcaseId = Number(getQuery(event).id)
  if (!showcaseId) return cResp([] as any[], '缺少 id', false)

  const rows = await db.query.showcaseComments.findMany({
    where: and(
      eq(schema.showcaseComments.showcaseId, showcaseId),
      isNull(schema.showcaseComments.deletedAt),
    ),
    orderBy: (sc, { desc }) => [desc(sc.createdAt)],
  })

  const userIds = [...new Set(rows.map((r) => r.userId))]
  const users = userIds.length ? await db.query.users.findMany({ where: inArray(schema.users.id, userIds) }) : []
  const userMap = new Map((users as any[]).map((u: any) => [u.id, u]))

  const nodes = rows.map((r) => ({
    ...r,
    userName: userMap.get(r.userId)?.name || '',
    avatarImg: userMap.get(r.userId)?.avatarImg || null,
    children: [] as any[],
  }))

  const top: any[] = []
  const byId = new Map<number, any>()
  for (const n of nodes) byId.set(n.id, n)
  for (const n of nodes) {
    if (n.parentId && byId.has(n.parentId)) byId.get(n.parentId).children.push(n)
    else top.push(n)
  }

  return cResp(top)
})