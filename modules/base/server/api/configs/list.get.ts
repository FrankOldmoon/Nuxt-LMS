export default defineEventHandler(async (event) => {
  await requireAdmin(event)

  const configRows = await listTable('configs')
  return cResp(configRows)
})
