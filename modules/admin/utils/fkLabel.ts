import type { ColumnMeta } from './types'

/**
 * FK 标签列覆盖表（与服务端 FK_LABEL_OVERRIDES 保持一致）
 * 用于前端展示时确定哪一列作为外键的显示标签。
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

/** 获取指定外表的标签列名 */
export function fkLabelColumn(table: string): string {
  return FK_LABEL_OVERRIDES[table] || 'name'
}

/** 从列定义提取 FK 列映射 { [jsName]: { table, labelColumn } } */
export function extractFkMap(columns: ColumnMeta[]): Record<string, { table: string; labelColumn: string }> {
  const map: Record<string, { table: string; labelColumn: string }> = {}
  for (const col of columns) {
    if (col.fkTable) {
      map[col.jsName] = { table: col.fkTable, labelColumn: col.fkLabel || fkLabelColumn(col.fkTable) }
    }
  }
  return map
}
