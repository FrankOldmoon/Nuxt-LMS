export default eventHandler(async (event) => {
  const table = 'courses'
  const data = await listTable(table)
  return cResp(data)
})
