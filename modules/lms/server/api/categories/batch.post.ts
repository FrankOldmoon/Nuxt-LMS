export default eventHandler(async (event) => {
  // Only admins can perform batch operations on categories
  await requireAdmin(event)

  const body = await readBody(event)
  const { ids, action } = body as { ids: number[]; action: string }

  try {
    const result = await batchTable('categories', ids, action as any)
    // Deleting a category will affect the home navigation (action includes delete)
    broadcastToAll({ type: 'home-changed', reason: 'categories.batch' })
    return cResp(result)
  } catch (error: any) {
    console.error(`Batch [${action}] operation on categories failed:`, error)
    return cResp(null, error.message || 'Batch operation failed', false)
  }
})
