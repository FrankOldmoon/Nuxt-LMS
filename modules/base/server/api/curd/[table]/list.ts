export default eventHandler(async (event) => {
  const table = validateTable(getRouterParam(event, 'table')!)
  const data = await listTable(table)
  return cResp(data)
})
