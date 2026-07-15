/**
 * Admin module client shared types (mirrors server-side ColumnMeta/TableMeta JSON form)
 * Server types are defined in modules/base/server/utils/db.ts, client cannot directly import, so mirrored here.
 */

export interface ColumnMeta {
  name: string
  jsName: string
  dataType: string
  columnType: string
  notNull: boolean
  hasDefault: boolean
  isPrimaryKey: boolean
  isAutoIncrement: boolean
  enumValues?: string[]
  isTimestamp: boolean
  isDeletedAt: boolean
  fkTable?: string
  fkLabel?: string
}

export interface TableMeta {
  name: string
  hasId: boolean
  compositePk: boolean
  columns: ColumnMeta[]
  labelColumn?: string
  readOnly: boolean
}

export interface TableMetaSummary {
  name: string
  labelColumn?: string
  hasId: boolean
  compositePk: boolean
  readOnly: boolean
  columns: ColumnMeta[]
}

export interface FilterCondition {
  column: string
  op: 'eq' | 'ne' | 'contains' | 'gt' | 'lt' | 'gte' | 'lte' | 'in' | 'null' | 'notnull'
  value?: any
}

export interface ListResult {
  data: any[]
  total: number
  page: number
  pageSize: number
  columns: ColumnMeta[]
  meta: TableMeta
}

export interface MenuItem {
  /** Leaf nodes have table (links to /dashboard/t/:table); group nodes have no table */
  table?: string
  label: string
  visible: boolean
  order: number
  /** Custom lucide icon name (e.g. "i-lucide-table"); defaults by table when absent */
  icon?: string
  /** Custom path; defaults to /dashboard/t/{table} when absent */
  to?: string
  /** Group node children (supports multi-level) */
  children?: MenuItem[]
}

export interface FkOption {
  id: number
  label: string
}
