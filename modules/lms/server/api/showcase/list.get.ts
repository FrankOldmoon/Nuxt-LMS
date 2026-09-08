/**
 * 学生作品列表
 * GET /api/showcase/list?page=1&pageSize=12&category=&keyword=
 *
 * 可见性：
 * - 游客/普通同学：只看已通过审批(approved)、未删除的作品
 * - 作者本人：额外能看到自己的 pending/rejected 作品
 * - 老师/管理员：看到全部（含待审）
 */
import { db, schema } from '@nuxthub/db'
import { eq, and, or, ilike, desc, sql, isNull, inArray } from 'drizzle-orm'

export default eventHandler(async (event) => {
  // 登录可选：游客也能浏览已过审作品
  let user: any = null
  try { user = await requireAuth(event) } catch { user = null }

  const q = getQuery(event)
  const page = Math.max(1, Number(q.page) || 1)
  const pageSize = Math.min(50, Math.max(1, Number(q.pageSize) || 12))
  const category = q.category ? String(q.category) : ''
  const tag = q.tag ? String(q.tag) : ''
  const keyword = q.keyword ? String(q.keyword).trim() : ''

  const isStaff = !!user?.roles?.some((r) => ['teacher', 'admin'].includes(r))
  const statusParam = ['approved', 'pending'].includes(String(q.status)) ? String(q.status) : ''

  // 可见性条件（不含分类/tag/关键词，用于计算可选 tag 列表）
  const baseConds: any[] = [isNull(schema.showcases.deletedAt)]
  if (isStaff) {
    // 老师/管理员：可按状态（approved / pending）过滤，未指定则看全部
    if (statusParam) baseConds.push(eq(schema.showcases.status, statusParam))
  } else if (user) {
    baseConds.push(or(
      eq(schema.showcases.status, 'approved'),
      eq(schema.showcases.userId, user.id),
    ))
  } else {
    baseConds.push(eq(schema.showcases.status, 'approved'))
  }
  const baseWhere = and(...baseConds)

  // 可选 tag（用于筛选 chips，聚合可见作品的所有 tag 去重）
  const tagRows = await db
    .select({ tags: schema.showcases.tags })
    .from(schema.showcases)
    .where(baseWhere)
  const tagSet = new Set<string>()
  for (const r of tagRows) {
    if (Array.isArray(r.tags)) for (const t of r.tags) if (typeof t === 'string' && t) tagSet.add(t)
  }
  const tags = [...tagSet].slice(0, 30)

  const conds: any[] = [...baseConds]
  if (category) conds.push(eq(schema.showcases.category, category))
  if (tag) conds.push(sql`${schema.showcases.tags} ? ${tag}`)
  if (keyword) conds.push(ilike(schema.showcases.title, `%${keyword}%`))

  const where = and(...conds)

  const totalRows = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(schema.showcases)
    .where(where)
  const total = totalRows[0]?.n ?? 0

  const rows = await db
    .select()
    .from(schema.showcases)
    .where(where)
    .orderBy(desc(schema.showcases.createdAt))
    .limit(pageSize)
    .offset((page - 1) * pageSize)

  // 作者信息
  const userIds = [...new Set(rows.map((r) => r.userId))]
  const authorRows = userIds.length ? await db.query.users.findMany({ where: inArray(schema.users.id, userIds) }) : []
  const userMap = new Map((authorRows as any[]).map((u: any) => [u.id, u]))

  // 当前用户点赞状态
  let likedMap = new Map<number, boolean>()
  if (user && rows.length) {
    const ids = rows.map((r) => r.id)
    const likes = await db.query.showcaseLikes.findMany({
      where: and(
        inArray(schema.showcaseLikes.showcaseId, ids),
        eq(schema.showcaseLikes.userId, user.id),
        eq(schema.showcaseLikes.like, true),
      ),
    })
    for (const l of likes) likedMap.set(l.showcaseId, true)
  }

  const items = rows.map((r) => ({
    ...r,
    userName: userMap.get(r.userId)?.name || '',
    avatarImg: userMap.get(r.userId)?.avatarImg || null,
    liked: likedMap.has(r.id),
  }))

  return cResp({ items, total, page, pageSize, tags })
})