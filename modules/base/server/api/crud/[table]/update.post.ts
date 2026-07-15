export default eventHandler(async (event) => {
  // Only admin can update
  await requireAdmin(event)

  const table = validateTable(getRouterParam(event, 'table')!)
  const body = await readBody(event)
  const { id, ...setData } = body

  if (!id) {
    return cResp(null, 'Missing id parameter', false)
  }

  try {
    const result = await updateTable(table, Number(id), setData)
    return cResp(result)
  } catch (error: any) {
    console.error('Update failed:', error)
    return cResp(null, error.message || 'Update failed', false)
  }
})
