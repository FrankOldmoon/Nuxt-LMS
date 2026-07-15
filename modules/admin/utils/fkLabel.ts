import type { ColumnMeta } from './types'

/**
 * FK label column override table (kept consistent with server-side FK_LABEL_OVERRIDES)
 * Used to determine which column to use as the display label for foreign keys in frontend rendering.
 */
const FK_LABEL_OVERRIDES: Record<string, string> = {
  users: 'name',
  classes: 'name',
  courses: 'name',
  chapters: 'name',
  roles: 'name',
  permissions: 'name',
  categories: 'name',
  files: 'name',
  tokens: 'name',
  medals: 'name',
}

/** Get the label column name for a specified foreign table */
export function fkLabelColumn(table: string): string {
  return FK_LABEL_OVERRIDES[table] || 'name'
}

/** Extract FK column mapping from column definitions { [jsName]: { table, labelColumn } } */
export function extractFkMap(columns: ColumnMeta[]): Record<string, { table: string; labelColumn: string }> {
  const map: Record<string, { table: string; labelColumn: string }> = {}
  for (const col of columns) {
    if (col.fkTable) {
      map[col.jsName] = { table: col.fkTable, labelColumn: col.fkLabel || fkLabelColumn(col.fkTable) }
    }
  }
  return map
}
