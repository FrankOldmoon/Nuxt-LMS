export default eventHandler(async (event) => {
  // 仅管理员可更新分类
  await requireAdmin(event)

  const body = await readBody(event)
  const { id, ...setData } = body

  if (!id) {
    return cResp(null, '缺少 id 参数', false)
  }

  try {
    const result = await updateTable('categories', Number(id), setData)
    return cResp(result)
  } catch (error: any) {
    console.error('更新分类失败:', error)
    return cResp(null, error.statusMessage || '更新失败', false)
  }
})
