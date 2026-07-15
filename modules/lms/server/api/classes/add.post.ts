export default eventHandler(async (event) => {
  // Only teachers/admins can create
  await requireRole(event, ['teacher', 'admin'])

  const table = 'classes'
  const body = await readBody(event)

  try {
    const result = await addTable(table, body)
    return cResp(result)
  } catch (error: any) {
    console.error('Insert failed:', error)
    return cResp(null, error.message || 'Insert failed', false)
  }
})
