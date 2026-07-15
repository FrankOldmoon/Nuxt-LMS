export default eventHandler(async (event) => {
  // Only admin can batch operate
  await requireAdmin(event)

  const table = validateTable(getRouterParam(event, 'table')!)
  const body = await readBody(event)
  const { ids, action } = body as { ids: number[]; action: string }

  try {
    const result = await batchTable(table, ids, action as any)
    return cResp(result)
  } catch (error: any) {
    console.error(`Batch [${action}] operation failed:`, error)
    return cResp(null, error.message || 'Batch operation failed', false)
  }
})
