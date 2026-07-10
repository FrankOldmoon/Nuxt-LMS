export default eventHandler(async (event) => {
  await requireAdmin(event)
  const tables = getSchemaTables()
  const metas = tables.map((name) => {
    const meta = getTableMeta(name)
    return {
      name: meta.name,
      labelColumn: meta.labelColumn,
      hasId: meta.hasId,
      compositePk: meta.compositePk,
      readOnly: meta.readOnly,
      columns: meta.columns,
    }
  })
  return cResp(metas)
})
