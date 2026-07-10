export default eventHandler(async (event) => {
  await requireAdmin(event)
  const config = await getMenuConfig()
  return cResp(config)
})
