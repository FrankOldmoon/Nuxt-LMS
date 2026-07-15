

export default eventHandler(async (event) => {
  // Only admins can add categories
  await requireAdmin(event)

  const body = await readBody(event)
  try {
    const result = await addTable('categories', body)
    // Notify all clients: home navigation has been updated
    broadcastToAll({ type: 'home-changed', reason: 'categories.add' })
    return cResp(result)
  } catch (error: any) {
    console.error('Failed to add category:', error)
    return cResp(null, error.message || 'Add failed', false)
  }
})
