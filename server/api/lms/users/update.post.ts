export default eventHandler(async (event) => {
  // 仅教师/管理员可更新
  await requireRole(event, ['teacher', 'admin'])

  const table = 'users'
  const body = await readBody(event)
  const { id, ...setData } = body

  if (!id) {
    return cResp(null, '缺少 id 参数', false)
  }

  try {
    const result = await updateTable(table, Number(id), setData)
    return cResp(result)
  } catch (error: any) {
    console.error('更新失败:', error)
    return cResp(null, error.statusMessage || '更新失败', false)
  }
})
