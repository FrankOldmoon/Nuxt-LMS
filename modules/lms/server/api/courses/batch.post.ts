

export default eventHandler(async (event) => {
  // 仅管理员可批量操作课程
  await requireAdmin(event)

  const body = await readBody(event)
  const { ids, action } = body as { ids: number[]; action: string }

  try {
    const result = await batchTable('courses', ids, action as any)
    // 删除课程会影响首页导航
    broadcastToAll({ type: 'home-changed', reason: 'courses.batch' })
    return cResp(result)
  } catch (error: any) {
    console.error(`批量[${action}]操作课程失败:`, error)
    return cResp(null, error.statusMessage || '批量操作失败', false)
  }
})
