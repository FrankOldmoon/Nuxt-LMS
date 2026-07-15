import { db, schema } from '@nuxthub/db'
import { isNull } from 'drizzle-orm'

export default eventHandler(async (event) => {
  await requireAdmin(event)
  const query = getQuery(event)
  const tableName = typeof query.table === 'string' ? query.table : ''

  if (!tableName || !(tableName in schema)) {
    return cResp([], 'Invalid table name', false)
  }

  const meta = getTableMeta(tableName)
  // Composite primary key tables have no id column, cannot provide id options → return empty
  if (!meta.hasId) {
    return cResp([])
  }
  const labelCol = (typeof query.label === 'string' && query.label) || meta.labelColumn || 'id'

  // Validate label column exists, otherwise fall back to id
  const labelJsName = meta.columns.some((c) => c.jsName === labelCol) ? labelCol : 'id'
  const table = (schema as any)[tableName]

  const rows = await db
    .select({ id: table.id, label: table[labelJsName] })
    .from(table)
    .where(isNull(table.deletedAt))
    .limit(200)

  const options = rows.map((r: any) => ({
    id: r.id,
    label: r.label != null && r.label !== '' ? String(r.label) : `#${r.id}`,
  }))

  return cResp(options)
})
