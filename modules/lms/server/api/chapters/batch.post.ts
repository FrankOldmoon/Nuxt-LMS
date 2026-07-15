export default eventHandler(async (event) => {
  // Only admins can perform batch operations on chapters
  await requireAdmin(event)

  const body = await readBody(event)
  const { ids, action } = body as { ids: number[]; action: string }

  try {
    const result = await batchTable('chapters', ids, action as any)
    return cResp(result)
  } catch (error: any) {
    console.error(`Batch [${action}] operation on chapters failed:`, error)
    return cResp(null, error.message || 'Batch operation failed', false)
  }
})
