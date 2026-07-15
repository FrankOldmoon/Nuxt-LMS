import { db } from "@nuxthub/db"
import { sql, desc, asc, getTableColumns } from "drizzle-orm"
import { getTable } from "./_helpers"
import { getTableMeta, type ListQuery, type ListResult } from "./schema-meta"
import { _buildWhere } from "./where"

/** Count rows matching the condition */
export async function countTableRows(tableName: string, query?: ListQuery): Promise<number> {
  const table = getTable(tableName)
  const where = _buildWhere(table, query)
  const rows = await db.select({ count: sql`count(*)`.as('count') }).from(table).where(where ?? sql`true`)
  return Number(rows[0]?.count ?? 0)
}

/**
 * Paginated list query: supports sorting / search / filtering / soft-delete toggle
 * Returns { data, total, page, pageSize, columns, meta }
 */
export async function listTablePaged(tableName: string, query: ListQuery): Promise<ListResult> {
  const table = getTable(tableName)
  const meta = getTableMeta(tableName)
  const cols = getTableColumns(table) as Record<string, any>
  const where = _buildWhere(table, query)

  // Sort: validate column exists, default id desc (composite PK uses first PK column)
  let orderBy: any
  if (query.sort && query.sort.column in cols) {
    orderBy = query.sort.dir === 'asc' ? asc(cols[query.sort.column]) : desc(cols[query.sort.column])
  } else {
    const firstPk = meta.hasId ? cols.id : meta.columns[0] && cols[meta.columns[0].jsName]
    orderBy = firstPk ? desc(firstPk) : undefined
  }

  const [data, countRows] = await Promise.all([
    db.select().from(table).where(where ?? sql`true`).orderBy(orderBy ?? sql`true`)
      .limit(query.pageSize).offset((query.page - 1) * query.pageSize),
    db.select({ count: sql`count(*)`.as('count') }).from(table).where(where ?? sql`true`),
  ])
  return {
    data, total: Number(countRows[0]?.count ?? 0),
    page: query.page, pageSize: query.pageSize,
    columns: meta.columns, meta,
  }
}

/** Export table data (no pagination, max 5000 rows) */
export async function exportTableRows(tableName: string, query?: Partial<ListQuery>): Promise<any[]> {
  const table = getTable(tableName)
  const where = _buildWhere(table, query as ListQuery | undefined)
  return db.select().from(table).where(where ?? sql`true`).limit(5000)
}

/**
 * Import rows: header names accept jsName / DB column names (case-insensitive), skip unknown columns,
 * skip id / timestamp columns by default (unless explicitly provided). Insert in batches, collect errors.
 */
export async function importTableRows(
  tableName: string,
  rows: Record<string, any>[],
): Promise<{ inserted: number; errors: string[] }> {
  const table = getTable(tableName)
  const meta = getTableMeta(tableName)

  // Build column name map: lower(jsName) / lower(dbName) → jsName
  const nameMap = new Map<string, string>()
  for (const col of meta.columns) {
    nameMap.set(col.jsName.toLowerCase(), col.jsName)
    nameMap.set(col.name.toLowerCase(), col.jsName)
  }

  // Columns skipped by default (unless explicitly provided and non-auto-increment)
  const skipByDefault = new Set(['id', 'createdAt', 'updatedAt', 'deletedAt'])

  let inserted = 0
  const errors: string[] = []

  for (let i = 0; i < rows.length; i++) {
    const raw = rows[i]
    if (!raw || typeof raw !== 'object') continue
    const record: Record<string, any> = {}
    for (const [key, val] of Object.entries(raw)) {
      const jsName = nameMap.get(String(key).toLowerCase())
      if (!jsName) continue
      const colMeta = meta.columns.find((c) => c.jsName === jsName)
      if (!colMeta) continue
      if (colMeta.isAutoIncrement) continue
      if (skipByDefault.has(jsName) && (val === '' || val === null || val === undefined)) continue
      record[jsName] = (val === '' && colMeta.dataType !== 'string') ? null : val
    }
    if (Object.keys(record).length === 0) continue
    try {
      await db.insert(table).values(record)
      inserted++
    } catch (err: any) {
      errors.push(`Row ${i + 2} (after skipping header): ${err?.message || String(err)}`)
    }
  }

  return { inserted, errors }
}
