import { db, schema } from '@nuxthub/db'
import { eq, and, isNull, desc, asc, sql, like, count } from 'drizzle-orm'

export default eventHandler(async (event) => {
  const user = await requireAuth(event)

  const query = getQuery(event)
  const page = Math.max(1, Number(query.page) || 1)
  const pageSize = Math.min(100, Math.max(1, Number(query.pageSize) || 20))
  const sort = String(query.sort || 'createdAt') // createdAt | size | name
  const order = String(query.order || 'desc') // desc | asc
  const keyword = String(query.keyword || '').trim()
  const group = String(query.group || '').trim()

  // 构建条件：小组文件按 group 过滤（共享空间）；个人文件按 userId 过滤
  const ownerFilter = group
    ? eq(schema.files.group, group)
    : eq(schema.files.userId, user.id)
  const where = keyword
    ? and(
        ownerFilter,
        isNull(schema.files.deletedAt),
        like(schema.files.name, `%${keyword}%`),
      )
    : and(ownerFilter, isNull(schema.files.deletedAt))

  // 总数
  const totalRows = await db
    .select({ total: count() })
    .from(schema.files)
    .where(where)
  const total = Number(totalRows[0]?.total) || 0

  // 排序
  const orderCol = sort === 'size'
    ? schema.files.size
    : sort === 'name'
      ? schema.files.name
      : schema.files.createdAt
  const orderFn = order === 'asc' ? asc : desc

  // 分页查询
  const rows = await db
    .select({
      id: schema.files.id,
      name: schema.files.name,
      path: schema.files.path,
      type: schema.files.type,
      size: schema.files.size,
      hash: schema.files.hash,
      group: schema.files.group,
      createdAt: schema.files.createdAt,
    })
    .from(schema.files)
    .where(where)
    .orderBy(orderFn(orderCol))
    .limit(pageSize)
    .offset((page - 1) * pageSize)

  const list = rows.map((r) => ({
    ...r,
    url: `/api/file?pathname=${encodeURIComponent(r.path.replace(/^\/+/, ''))}`,
  }))

  return cResp({
    list,
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
  })
})
