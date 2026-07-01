export default eventHandler(async (event) => {
  // 仅管理员可批量操作分类
  await requireAdmin(event)

  const body = await readBody(event)
  const { ids, action } = body as { ids: number[]; action: string }

  try {
    const result = await batchTable('categories', ids, action as any)
    return cResp(result)
  } catch (error: any) {
    console.error(`批量[${action}]操作分类失败:`, error)
    return cResp(null, error.statusMessage || '批量操作失败', false)
  }
})
