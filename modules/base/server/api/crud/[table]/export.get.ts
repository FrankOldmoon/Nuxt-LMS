export default eventHandler(async (event) => {
  // Only admin can export
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
      // Ignore on parse failure
    }
  }

  try {
    const rows = await exportTableRows(table, { search, filters, includeDeleted })
    return cResp(rows)
  } catch (error: any) {
    console.error('Export failed:', error)
    return cResp(null, error.message || 'Export failed', false)
  }
})
