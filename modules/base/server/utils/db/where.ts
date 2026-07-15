import { and, isNull, isNotNull, or, ilike, sql, inArray, eq, getTableColumns } from "drizzle-orm"
import type { ListQuery } from "./schema-meta"

/**
 * Build where condition array (soft delete / search / filter)
 * Returns undefined when no conditions
 */
export function _buildWhere(table: any, query?: ListQuery) {
  const cols = getTableColumns(table) as Record<string, any>
  const conditions: any[] = []

  // Soft delete filter
  if ('deletedAt' in cols) {
    if (query?.includeDeleted) conditions.push(isNotNull(cols.deletedAt))
    else conditions.push(isNull(cols.deletedAt))
  }

  // Global search: first 4 text columns (excluding deletedAt / password)
  if (query?.search) {
    const q = `%${query.search}%`
    const textCols: any[] = []
    for (const [jsName, col] of Object.entries(cols)) {
      if (col.dataType === 'string' && jsName !== 'deletedAt' && jsName !== 'password') {
        textCols.push(col)
      }
    }
    if (textCols.length > 0) {
      const searchCols = textCols.slice(0, 4)
      conditions.push(or(...searchCols.map((c) => ilike(c, q))))
    }
  }

  // Multi-condition filter
  if (query?.filters && query.filters.length > 0) {
    for (const f of query.filters) {
      const col = cols[f.column]
      if (!col) continue
      switch (f.op) {
        case 'eq': conditions.push(eq(col, f.value)); break
        case 'ne': conditions.push(sql`${col} != ${f.value}`); break
        case 'contains': conditions.push(ilike(col, `%${f.value}%`)); break
        case 'gt': conditions.push(sql`${col} > ${f.value}`); break
        case 'lt': conditions.push(sql`${col} < ${f.value}`); break
        case 'gte': conditions.push(sql`${col} >= ${f.value}`); break
        case 'lte': conditions.push(sql`${col} <= ${f.value}`); break
        case 'in':
          if (Array.isArray(f.value) && f.value.length > 0) conditions.push(inArray(col, f.value))
          break
        case 'null': conditions.push(isNull(col)); break
        case 'notnull': conditions.push(isNotNull(col)); break
      }
    }
  }

  return conditions.length > 0 ? and(...conditions) : undefined
}
