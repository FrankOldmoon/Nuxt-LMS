export default eventHandler(async (event) => {
  const table = validateTable(getRouterParam(event, 'table')!)
  const id = Number(getQuery(event).id)
  if (!id) {
    return cResp(null, 'Missing id parameter', false)
  }
  const data = await showTable(table, id)
  return cResp(data)
})
