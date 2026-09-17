export default eventHandler(async (event) => {
  await requireAdmin(event)
  const report = await getPlatformReport()
  return cResp(report)
})
