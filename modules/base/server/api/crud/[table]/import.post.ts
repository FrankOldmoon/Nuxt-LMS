export default eventHandler(async (event) => {
  // 仅管理员可导入
  await requireAdmin(event)

  const table = validateTable(getRouterParam(event, 'table')!)
  const body = await readBody(event)
  const rows = Array.isArray(body?.rows) ? body.rows : []

  if (rows.length === 0) {
    return cResp({ inserted: 0, errors: ['未提供数据行'] }, '未提供数据行', false)
  }

  try {
    const result = await importTableRows(table, rows)
    return cResp(result, result.errors.length ? `已插入 ${result.inserted} 行，${result.errors.length} 行失败` : `已插入 ${result.inserted} 行`)
  } catch (error: any) {
    console.error('导入失败:', error)
    return cResp(null, error.statusMessage || '导入失败', false)
  }
})
