export default eventHandler(async (event) => {
  // 仅管理员可导出
  await requireAdmin(event)

  const table = validateTable(getRouterParam(event, 'table')!)
  const query = getQuery(event)

  const search = typeof query.search === 'string' && query.search ? query.search : undefined
  const includeDeleted = query.includeDeleted === 'true' || query.includeDeleted === '1'

  let filters: any[] | undefined
  if (typeof query.filters === 'string' && query.filters) {
    try {
      const parsed = JSON.parse(query.filters)
      if (Array.isArray(parsed)) filters = parsed
    } catch {
      // 解析失败忽略
    }
  }

  try {
    const rows = await exportTableRows(table, { search, filters, includeDeleted })
    return cResp(rows)
  } catch (error: any) {
    console.error('导出失败:', error)
    return cResp(null, error.statusMessage || '导出失败', false)
  }
})
