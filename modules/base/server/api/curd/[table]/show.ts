export default eventHandler(async (event) => {
  const table = validateTable(getRouterParam(event, 'table')!)
  const id = Number(getQuery(event).id)
  if (!id) {
    return cResp(null, '缺少 id 参数', false)
  }
  const data = await showTable(table, id)
  return cResp(data)
})
