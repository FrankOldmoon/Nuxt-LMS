import { schema } from "@nuxthub/db"
import { isTable, getTableColumns } from "drizzle-orm"
import { getTable } from "./_helpers"

/** Metadata / list query / filter types */
export type ColumnMeta = {
  name: string; jsName: string
  dataType: string; columnType: string
  notNull: boolean; hasDefault: boolean
  isPrimaryKey: boolean; isAutoIncrement: boolean
  isTimestamp: boolean; isDeletedAt: boolean
  enumValues?: string[]; fkTable?: string; fkLabel?: string
}
export type TableMeta = {
  name: string; hasId: boolean; compositePk: boolean
  columns: ColumnMeta[]; labelColumn?: string; readOnly: boolean
}
export type FilterCondition = {
  column: string
  op: 'eq' | 'ne' | 'contains' | 'gt' | 'lt' | 'gte' | 'lte' | 'in' | 'null' | 'notnull'
  value?: any
}
export type ListQuery = {
  page: number; pageSize: number
  sort?: { column: string; dir: 'asc' | 'desc' } | null
  search?: string; filters?: FilterCondition[]
  includeDeleted?: boolean
}
export type ListResult = {
  data: any[]; total: number; page: number; pageSize: number
  columns: ColumnMeta[]; meta: TableMeta
}
/** English pluralization (covers all table name cases in schema) */
function pluralize(word: string): string {
  if (!word) return word
  const lower = word.toLowerCase()
  if (/(s|x|z|ch|sh)$/.test(lower)) return word + 'es'
  if (/[^aeiou]y$/.test(lower)) return word.slice(0, -1) + 'ies'
  return word + 's'
}
/** Known FK label column overrides (tables without a name column) */
const FK_LABEL_OVERRIDES: Record<string, string> = {
  users: 'name', classes: 'name', courses: 'name', chapters: 'name',
  roles: 'name', permissions: 'name', categories: 'name', files: 'name',
  tokens: 'name', medals: 'name',
}
const LABEL_CANDIDATES = ['name', 'title', 'code', 'username']
/** All table names (jsName) in schema, excluding withTimestamps / *Relations and other non-table exports */
export function getSchemaTables(): string[] {
  const tables: string[] = []
  for (const [key, value] of Object.entries(schema)) {
    if (isTable(value)) tables.push(key)
  }
  return tables.sort()
}
/** Build single column metadata */
function buildColumnMeta(jsName: string, col: any): ColumnMeta {
  const meta: ColumnMeta = {
    name: col.name, jsName,
    dataType: col.dataType, columnType: col.columnType,
    notNull: !!col.notNull, hasDefault: !!col.hasDefault,
    isPrimaryKey: false, isAutoIncrement: col.columnType === 'PgSerial',
    isTimestamp: col.dataType === 'date' || col.columnType === 'PgTimestamp' || col.columnType === 'PgDate',
    isDeletedAt: jsName === 'deletedAt',
  }
  if (col.enumValues && col.enumValues.length) meta.enumValues = col.enumValues
  return meta
}
/** Table metadata: column definitions, primary key detection, FK heuristic detection, label column */
export function getTableMeta(tableName: string): TableMeta {
  const table = getTable(tableName)
  const cols = getTableColumns(table) as Record<string, any>
  const hasId = 'id' in cols
  const compositePk = !hasId
  const columns: ColumnMeta[] = Object.entries(cols).map(([jsName, col]) => {
    const meta = buildColumnMeta(jsName, col)
    meta.isPrimaryKey = hasId ? jsName === 'id' : jsName.endsWith('Id')
    if (jsName.endsWith('Id') && jsName.length > 2) {
      const candidate = pluralize(jsName.slice(0, -2))
      if (candidate in schema && isTable((schema as any)[candidate])) {
        meta.fkTable = candidate
        meta.fkLabel = FK_LABEL_OVERRIDES[candidate] || 'name'
      }
    }
    return meta
  })
  let labelColumn: string | undefined
  for (const c of LABEL_CANDIDATES) { if (c in cols) { labelColumn = c; break } }
  return { name: tableName, hasId, compositePk, columns, labelColumn, readOnly: compositePk }
}
/** FK map { [jsName]: { table, labelColumn } } */
export function getFkMap(tableName: string): Record<string, { table: string; labelColumn: string }> {
  const meta = getTableMeta(tableName)
  const map: Record<string, { table: string; labelColumn: string }> = {}
  for (const col of meta.columns) {
    if (col.fkTable) map[col.jsName] = { table: col.fkTable, labelColumn: col.fkLabel || 'name' }
  }
  return map
}
