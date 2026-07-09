export default eventHandler(async (event) => {
  await requireAuth(event)
  const table = validateTable(getRouterParam(event, 'table')!)
  const data = await listTable(table)
  return cResp(data)
})
