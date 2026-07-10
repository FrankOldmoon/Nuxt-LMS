export default eventHandler(async (event) => {
  await requireAdmin(event)
  const table = validateTable(getRouterParam(event, 'table')!)
  const body = await readBody(event)
  const hidden = Array.isArray(body?.hidden)
    ? body.hidden.filter((h: any) => typeof h === 'string')
    : []
  await setColumnConfig(table, hidden)
  return cResp({ hidden })
})
