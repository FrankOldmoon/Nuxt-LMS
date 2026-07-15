export default eventHandler(async (event) => {
  // Only admin can add
  await requireAdmin(event)

  const table = validateTable(getRouterParam(event, 'table')!)
  const body = await readBody(event)

  try {
    const result = await addTable(table, body)
    return cResp(result)
  } catch (error: any) {
    console.error('Insert failed:', error)
    return cResp(null, error.message || 'Insert failed', false)
  }
})
