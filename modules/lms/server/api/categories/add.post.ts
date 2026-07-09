

export default eventHandler(async (event) => {
  // 仅管理员可新增分类
  await requireAdmin(event)

  const body = await readBody(event)
  try {
    const result = await addTable('categories', body)
    // 通知所有客户端：首页导航已更新
    broadcastToAll({ type: 'home-changed', reason: 'categories.add' })
    return cResp(result)
  } catch (error: any) {
    console.error('新增分类失败:', error)
    return cResp(null, error.statusMessage || '新增失败', false)
  }
})
