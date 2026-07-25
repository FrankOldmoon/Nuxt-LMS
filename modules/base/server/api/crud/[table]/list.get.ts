export default eventHandler(async (event) => {
  // 仅管理员可访问列表（含元数据）
  await requireAdmin(event)

  const table = validateTable(getRouterParam(event, 'table')!)
  const query = getQuery(event)

  // 解析分页参数
  const page = Math.max(1, Number(query.page) || 1)
  const pageSize = Math.min(200, Math.max(1, Number(query.pageSize) || 20))

  // 解析排序：sort 格式 "column:dir"（如 "createdAt:desc"）
  let sort: { column: string; dir: 'asc' | 'desc' } | null = null
  if (typeof query.sort === 'string' && query.sort) {
    const [column, dir] = query.sort.split(':')
    if (column && (dir === 'asc' || dir === 'desc')) {
      sort = { column, dir }
    }
  }

  // 搜索
  const search = typeof query.search === 'string' && query.search ? query.search : undefined

  // 是否包含已软删除（垃圾桶模式）
  const includeDeleted = query.includeDeleted === 'true' || query.includeDeleted === '1'

  // 多条件筛选：filters 为 JSON 字符串
  let filters: any[] | undefined
  if (typeof query.filters === 'string' && query.filters) {
    try {
      const parsed = JSON.parse(query.filters)
      if (Array.isArray(parsed)) filters = parsed
    } catch {
      // 解析失败忽略
    }
  }

  const result = await listTablePaged(table, { page, pageSize, sort, search, filters, includeDeleted })
  return cResp(result)
})
