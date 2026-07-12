import { db } from "@nuxthub/db"
import { sql, desc, asc, getTableColumns } from "drizzle-orm"
import { getTable } from "./_helpers"
import { getTableMeta, type ListQuery, type ListResult } from "./schema-meta"
import { _buildWhere } from "./where"

/** 统计符合条件的行数 */
export async function countTableRows(tableName: string, query?: ListQuery): Promise<number> {
  const table = getTable(tableName)
  const where = _buildWhere(table, query)
  const rows = await db.select({ count: sql`count(*)`.as('count') }).from(table).where(where ?? sql`true`)
  return Number(rows[0]?.count ?? 0)
}

/**
 * 分页列表查询：支持排序 / 搜索 / 筛选 / 软删除切换
 * 返回 { data, total, page, pageSize, columns, meta }
 */
export async function listTablePaged(tableName: string, query: ListQuery): Promise<ListResult> {
  const table = getTable(tableName)
  const meta = getTableMeta(tableName)
  const cols = getTableColumns(table) as Record<string, any>
  const where = _buildWhere(table, query)

  // 排序：校验列存在，默认 id desc（复合主键用首个 PK 列）
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

/** 导出表数据（不分页，上限 5000 行） */
export async function exportTableRows(tableName: string, query?: Partial<ListQuery>): Promise<any[]> {
  const table = getTable(tableName)
  const where = _buildWhere(table, query as ListQuery | undefined)
  return db.select().from(table).where(where ?? sql`true`).limit(5000)
}

/**
 * 导入行数据：表头名兼容 jsName / DB 列名（不区分大小写），跳过未知列，
 * 默认跳过 id / 时间戳列（除非显式提供）。逐批插入，收集错误。
 */
export async function importTableRows(
  tableName: string,
  rows: Record<string, any>[],
): Promise<{ inserted: number; errors: string[] }> {
  const table = getTable(tableName)
  const meta = getTableMeta(tableName)

  // 建立列名映射：lower(jsName) / lower(dbName) → jsName
  const nameMap = new Map<string, string>()
  for (const col of meta.columns) {
    nameMap.set(col.jsName.toLowerCase(), col.jsName)
    nameMap.set(col.name.toLowerCase(), col.jsName)
  }

  // 默认跳过的列（除非显式提供且非自增）
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
      errors.push(`第 ${i + 2} 行（跳过表头后）: ${err?.message || String(err)}`)
    }
  }

  return { inserted, errors }
}
