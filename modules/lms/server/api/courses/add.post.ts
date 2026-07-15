export default eventHandler(async (event) => {
  // Only admins can create courses
  await requireAdmin(event)

  const body = await readBody(event)
  try {
    const result = await addTable('courses', body)
    // Notify all clients: home navigation has been updated
    broadcastToAll({ type: 'home-changed', reason: 'courses.add' })
    return cResp(result)
  } catch (error: any) {
    console.error('Failed to create course:', error)
    return cResp(null, error.message || 'Create failed', false)
  }
})
