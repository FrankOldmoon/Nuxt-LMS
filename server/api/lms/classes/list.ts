export default eventHandler(async (event) => {
  const table = 'classes'
  const data = await listTable(table)
  return cResp(data)
})
