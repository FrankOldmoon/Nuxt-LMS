export default eventHandler(async (event) => {
  // Only teacher/admin can update
  await requireRole(event, ['teacher', 'admin'])

  const table = 'users'
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
