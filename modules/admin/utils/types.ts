/**
 * Admin 模块客户端共享类型（镜像服务端 ColumnMeta/TableMeta 的 JSON 形态）
 * 服务端类型定义在 modules/base/server/utils/db.ts，客户端无法直接 import，故在此镜像。
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
  /** 叶子节点有 table（链接到 /dashboard/t/:table）；分组节点无 table */
  table?: string
  label: string
  visible: boolean
  order: number
  /** 自定义 lucide 图标名（如 "i-lucide-table"）；缺省时按 table 给默认 */
  icon?: string
  /** 自定义路径；缺省时为 /dashboard/t/{table} */
  to?: string
  /** 分组节点的子项（支持多层级） */
  children?: MenuItem[]
}

export interface FkOption {
  id: number
  label: string
}
