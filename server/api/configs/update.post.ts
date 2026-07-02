export default defineEventHandler(async (event) => {
  await requireAdmin(event)

  const body = await readBody(event)
  const { id, value } = body

  if (!id) {
    return cResp(null, '缺少配置 id', false)
  }

  await upsertConfig(id, value)
  return cResp(null, '配置更新成功')
})
