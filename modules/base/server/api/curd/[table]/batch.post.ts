export default eventHandler(async (event) => {
  // 仅教师/管理员可批量操作
  await requireRole(event, ['teacher', 'admin'])

  const table = validateTable(getRouterParam(event, 'table')!)
  const body = await readBody(event)
  const { ids, action } = body as { ids: number[]; action: string }

  try {
    const result = await batchTable(table, ids, action as any)
    return cResp(result)
  } catch (error: any) {
    console.error(`批量[${action}]操作失败:`, error)
    return cResp(null, error.statusMessage || '批量操作失败', false)
  }
})
