export default eventHandler(async (event) => {
  // 仅教师/管理员可查看用户详情
  await requireRole(event, ['teacher', 'admin'])

  const table = 'users'
  const id = Number(getQuery(event).id)
  if (!id) {
    return cResp(null, '缺少 id 参数', false)
  }
  const data = await showTable(table, id)
  // 剥离敏感字段，不泄露密码哈希
  if (data && typeof data === 'object') {
    delete (data as Record<string, any>).password
  }
  return cResp(data)
})
