export default eventHandler(async (event) => {
  const table = 'classes'
  const body = await readBody(event)
  const { id, ...setData } = body

  if (!id) {
    return cResp(null, '缺少 id 参数', false)
  }

  // 仅管理员可更新班级信息
  await requireAdmin(event)

  try {
    const result = await updateTable(table, Number(id), setData)
    return cResp(result)
  } catch (error: any) {
    console.error('更新失败:', error)
    return cResp(null, error.message || '更新失败', false)
  }
})
