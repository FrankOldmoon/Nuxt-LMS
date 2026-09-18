export default eventHandler(async (event) => {
  // 仅管理员可新增
  await requireAdmin(event)

  const table = validateTable(getRouterParam(event, 'table')!)
  const body = await readBody(event)

  try {
    const result = await addTable(table, body)
    // configs 表写入会影响内存配置缓存，bump 版本戳让所有进程重载
    if (table === 'configs') await bumpConfigVersion()
    return cResp(result)
  } catch (error: any) {
    console.error('插入失败:', error)
    return cResp(null, error.message || '插入失败', false)
  }
})
