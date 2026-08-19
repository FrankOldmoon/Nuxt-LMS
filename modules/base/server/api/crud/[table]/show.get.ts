export default eventHandler(async (event) => {
  // 仅管理员可查看单条记录（users/tokens 等表含敏感字段）
  await requireAdmin(event)

  const table = validateTable(getRouterParam(event, 'table')!)
  const id = Number(getQuery(event).id)
  if (!id) {
    return cResp(null, '缺少 id 参数', false)
  }
  const data = await showTable(table, id)
  return cResp(data)
})
