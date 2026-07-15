export default eventHandler(async (event) => {
  // Only admin can import
  await requireAdmin(event)

  const table = validateTable(getRouterParam(event, 'table')!)
  const body = await readBody(event)
  const rows = Array.isArray(body?.rows) ? body.rows : []

  if (rows.length === 0) {
    return cResp({ inserted: 0, errors: ['No data rows provided'] }, 'No data rows provided', false)
  }

  try {
    const result = await importTableRows(table, rows)
    return cResp(result, result.errors.length ? `Inserted ${result.inserted} rows, ${result.errors.length} rows failed` : `Inserted ${result.inserted} rows`)
  } catch (error: any) {
    console.error('Import failed:', error)
    return cResp(null, error.message || 'Import failed', false)
  }
})
