export default eventHandler(async (event) => {
  await requireAdmin(event)
  const stats = await getDashboardStats()
  return cResp(stats)
})
