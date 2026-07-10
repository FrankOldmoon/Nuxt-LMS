export default eventHandler(async (event) => {
  await requireAdmin(event)
  const table = validateTable(getRouterParam(event, 'table')!)
  const config = await getColumnConfig(table)
  return cResp(config)
})
