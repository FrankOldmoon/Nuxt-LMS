export default eventHandler(async (event) => {
  // 仅管理员可更新
  await requireAdmin(event)

  const table = validateTable(getRouterParam(event, 'table')!)
  const body = await readBody(event)
  const { id, ...setData } = body

  if (!id) {
    return cResp(null, '缺少 id 参数', false)
  }

  try {
    const result = await updateTable(table, Number(id), setData)
    // configs 表写入会影响内存配置缓存，bump 版本戳让所有进程重载
    if (table === 'configs') await bumpConfigVersion()
    return cResp(result)
  } catch (error: any) {
    console.error('更新失败:', error)
    return cResp(null, error.message || '更新失败', false)
  }
})
