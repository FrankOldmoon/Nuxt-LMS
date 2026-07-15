export default eventHandler(async (event) => {
  await requireAdmin(event)
  const body = await readBody(event)
  const raw = Array.isArray(body?.items) ? body.items : []

  // Normalize (recursive): leaf validates table, group keeps children, reorder order
  const tables = new Set(getSchemaTables())

  function normalize(items: any[]): any[] {
    const result: any[] = []
    items.forEach((item, idx) => {
      if (!item || typeof item !== 'object') return
      if (Array.isArray(item.children) && item.children.length > 0) {
        // Group node
        const children = normalize(item.children)
        result.push({
          label: typeof item.label === 'string' && item.label ? item.label : 'Group',
          visible: item.visible !== false,
          order: idx,
          children,
        })
      } else if (typeof item.table === 'string' && tables.has(item.table)) {
        // Leaf node
        result.push({
          table: item.table,
          label: typeof item.label === 'string' && item.label ? item.label : humanizeTableName(item.table),
          visible: item.visible !== false,
          order: idx,
        })
      }
      // Neither valid table nor children → discard
    })
    return result
  }

  const normalized = normalize(raw)

  await setMenuConfig(normalized)
  return cResp({ items: normalized })
})
