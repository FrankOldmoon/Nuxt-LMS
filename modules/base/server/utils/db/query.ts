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

/**
 * 统计 jsonb 字段中某个普通文本片段出现次数（用于替换前 dry-run / 替换后核对）。
 * 例：countColumnText('chapters', 'content', '10.21.1.1')
 */
export async function countColumnText(
  tableName: string,
  column: string,
  text: string,
): Promise<{ affectedRows: number; occurrences: number }> {
  const rows = await db.execute(sql`
    SELECT
      count(*) AS affected_rows,
      COALESCE(sum(
        (length(${sql.raw(column)}::text)
          - length(replace(${sql.raw(column)}::text, ${text}, ''))
        ) / length(${text})
      ), 0) AS occurrences
    FROM ${sql.raw(tableName)}
    WHERE ${sql.raw(column)}::text LIKE ${'%' + text + '%'}
  `)
  const row = rows?.rows?.[0] as { affected_rows?: number; occurrences?: number } | undefined
  return {
    affectedRows: Number(row?.affected_rows ?? 0),
    occurrences: Number(row?.occurrences ?? 0),
  }
}

/**
 * 在指定表的 jsonb 字段中，将普通文本 from 整体替换为 to，返回受影响行数。
 * 适用于不含 JSON 特殊字符的普通文本（如 IP 地址），替换不会破坏 JSON 结构。
 * 例：replaceJsonbText('chapters', 'content', '10.21.1.1', '10.22.22.2')
 * （若列本身是 text，去掉末尾的 ::jsonb 强转即可。）
 */
export async function replaceJsonbText(
  tableName: string,
  column: string,
  from: string,
  to: string,
): Promise<number> {
  const result = await db.execute(sql`
    UPDATE ${sql.raw(tableName)}
    SET ${sql.raw(column)} = REPLACE(${sql.raw(column)}::text, ${from}, ${to})::jsonb
    WHERE ${sql.raw(column)}::text LIKE ${'%' + from + '%'}
  `)
  return result?.rowCount ?? 0
}
