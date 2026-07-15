

export default eventHandler(async (event) => {
  // Only admins can perform batch operations on courses
  await requireAdmin(event)

  const body = await readBody(event)
  const { ids, action } = body as { ids: number[]; action: string }

  try {
    const result = await batchTable('courses', ids, action as any)
    // Deleting courses affects the home navigation
    broadcastToAll({ type: 'home-changed', reason: 'courses.batch' })
    return cResp(result)
  } catch (error: any) {
    console.error(`Batch [${action}] operation on courses failed:`, error)
    return cResp(null, error.message || 'Batch operation failed', false)
  }
})
