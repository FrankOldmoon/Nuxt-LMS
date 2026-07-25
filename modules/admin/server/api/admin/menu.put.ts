export default eventHandler(async (event) => {
  await requireAdmin(event)
  const body = await readBody(event)
  const raw = Array.isArray(body?.items) ? body.items : []

  // 规范化（递归）：叶子校验 table，分组保留 children，重排 order
  const tables = new Set(getSchemaTables())

  function normalize(items: any[]): any[] {
    const result: any[] = []
    items.forEach((item, idx) => {
      if (!item || typeof item !== 'object') return
      if (Array.isArray(item.children) && item.children.length > 0) {
        // 分组节点
        const children = normalize(item.children)
        result.push({
          label: typeof item.label === 'string' && item.label ? item.label : 'Group',
          visible: item.visible !== false,
          order: idx,
          children,
        })
      } else if (typeof item.table === 'string' && tables.has(item.table)) {
        // 叶子节点
        result.push({
          table: item.table,
          label: typeof item.label === 'string' && item.label ? item.label : humanizeTableName(item.table),
          visible: item.visible !== false,
          order: idx,
        })
      }
      // 既无有效 table 又无 children → 丢弃
    })
    return result
  }

  const normalized = normalize(raw)

  await setMenuConfig(normalized)
  return cResp({ items: normalized })
})
