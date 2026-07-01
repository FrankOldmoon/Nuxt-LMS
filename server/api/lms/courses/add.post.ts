export default eventHandler(async (event) => {
  // 仅管理员可新增课程
  await requireAdmin(event)

  const body = await readBody(event)
  try {
    const result = await addTable('courses', body)
    return cResp(result)
  } catch (error: any) {
    console.error('新增课程失败:', error)
    return cResp(null, error.statusMessage || '新增失败', false)
  }
})
