export default eventHandler(async (event) => {
  // 仅教师/管理员可新增
  await requireRole(event, ['teacher', 'admin'])

  const table = 'classes'
  const body = await readBody(event)

  try {
    const result = await addTable(table, body)
    return cResp(result)
  } catch (error: any) {
    console.error('插入失败:', error)
    return cResp(null, error.message || '插入失败', false)
  }
})
