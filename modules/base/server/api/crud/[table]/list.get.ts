export default eventHandler(async (event) => {
  // Only admin can access list (includes metadata)
  await requireAdmin(event)

  const table = validateTable(getRouterParam(event, 'table')!)
  const query = getQuery(event)

  // Parse pagination params
  const page = Math.max(1, Number(query.page) || 1)
  const pageSize = Math.min(200, Math.max(1, Number(query.pageSize) || 20))

  // Parse sort: sort format "column:dir" (e.g. "createdAt:desc")
  let sort: { column: string; dir: 'asc' | 'desc' } | null = null
  if (typeof query.sort === 'string' && query.sort) {
    const [column, dir] = query.sort.split(':')
    if (column && (dir === 'asc' || dir === 'desc')) {
      sort = { column, dir }
    }
  }

  // Search
  const search = typeof query.search === 'string' && query.search ? query.search : undefined

  // Whether to include soft-deleted (trash bin mode)
  const includeDeleted = query.includeDeleted === 'true' || query.includeDeleted === '1'

  // Multi-condition filter: filters is a JSON string
  let filters: any[] | undefined
  if (typeof query.filters === 'string' && query.filters) {
    try {
      const parsed = JSON.parse(query.filters)
      if (Array.isArray(parsed)) filters = parsed
    } catch {
      // Ignore on parse failure
    }
  }

  const result = await listTablePaged(table, { page, pageSize, sort, search, filters, includeDeleted })
  return cResp(result)
})
