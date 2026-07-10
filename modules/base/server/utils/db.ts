import { db, schema } from "@nuxthub/db"
import {
  eq, inArray, and, isNull, isNotNull, or, ilike, desc, asc, sql,
  isTable, getTableColumns,
} from "drizzle-orm"

/**
 * 校验表名是否在 schema 中定义，无效则抛出错误
 */
export function validateTable(tableName: string | undefined): string {
  if (!tableName || !(tableName in schema)) {
    throw createError({ statusCode: 400, statusMessage: `无效的表名: ${tableName}` })
  }
  return tableName
}

/** 获取 schema 中指定表的定义 */
function getTable(tableName: string) {
  return (schema as any)[tableName]
}

// ====================== 基础 CRUD ======================

/**
 * 列表查询：获取表中所有记录
 * @example listTable('categories') // => all categories
 */
export async function listTable(tableName: string) {
  const table = getTable(tableName)
  return db.select().from(table)
}

/**
 * 单条查询：按 id 获取记录
 * @example showTable('courses', 1) // => course with id=1
 */
export async function showTable(tableName: string, id: number) {
  const table = getTable(tableName)
  const rows = await db.select().from(table).where(eq(table.id, id)).limit(1)
  return rows[0] ?? null
}

/**
 * 新增记录
 * @returns 插入后返回的记录
 */
export async function addTable(tableName: string, data: Record<string, any>) {
  const table = getTable(tableName)
  const rows = await db.insert(table).values(data).returning()
  return rows
}

/**
 * 更新记录：按 id 更新指定字段
 * @param id - 记录主键
 * @param data - 要更新的字段（不含 id）
 */
export async function updateTable(tableName: string, id: number, data: Record<string, any>) {
  const table = getTable(tableName)
  const result = await db.update(table).set(data).where(eq(table.id, id))
  return result
}

// ====================== 批量操作 ======================

export type BatchAction = 'delete' | 'remove' | 'restore'

const VALID_ACTIONS: BatchAction[] = ['delete', 'remove', 'restore']

/**
 * 批量操作
 * - delete: 软删除（设置 deleted_at）
 * - remove: 硬删除（物理删除）
 * - restore: 恢复软删除（清空 deleted_at）
 */
export async function batchTable(
  tableName: string,
  ids: number[],
  action: BatchAction,
) {
  if (!ids || !Array.isArray(ids) || ids.length === 0) {
    throw createError({ statusCode: 400, statusMessage: 'ids 不能为空' })
  }
  if (!VALID_ACTIONS.includes(action)) {
    throw createError({
      statusCode: 400,
      statusMessage: `无效的 action: ${action}，可选值: ${VALID_ACTIONS.join(', ')}`,
    })
  }

  const table = getTable(tableName)
  const idList = ids.map(Number)

  switch (action) {
    case 'delete':
      return db.update(table).set({ deletedAt: new Date() } as any).where(inArray(table.id, idList))
    case 'remove':
      return db.delete(table).where(inArray(table.id, idList))
    case 'restore':
      return db.update(table).set({ deletedAt: null } as any).where(inArray(table.id, idList))
  }
}

// ====================== 角色分配 ======================

/**
 * 给用户分配指定 code 的角色（幂等：已存在则跳过）
 *
 * @returns true=分配成功（或已存在），false=role code 不存在
 */
export async function assignRoleToUser(userId: number, roleCode: string): Promise<boolean> {
  const roleRows = await db
    .select({ id: schema.roles.id })
    .from(schema.roles)
    .where(and(eq(schema.roles.code, roleCode), isNull(schema.roles.deletedAt)))
    .limit(1)

  const roleRow = roleRows[0]
  if (!roleRow) {
    console.warn(`[assignRoleToUser] role code '${roleCode}' 不存在，跳过分配 (userId=${userId})`)
    return false
  }

  await db
    .insert(schema.userRoles)
    .values({ userId, roleId: roleRow.id })
    .onConflictDoNothing()

  return true
}

// ====================== 用户搜索 ======================

/**
 * 搜索用户（按用户名或姓名模糊匹配），排除已软删除的
 */
export async function searchUsers(keyword: string, limit = 100) {
  return db
    .select({
      id: schema.users.id,
      username: schema.users.username,
      name: schema.users.name,
      avatarImg: schema.users.avatarImg,
    })
    .from(schema.users)
    .where(
      and(
        isNull(schema.users.deletedAt),
        or(
          ilike(schema.users.username, `%${keyword}%`),
          ilike(schema.users.name, `%${keyword}%`),
        ),
      ),
    )
    .limit(limit)
}

// ====================== 配置 upsert ======================

/**
 * 配置项 upsert（插入或更新）
 */
export async function upsertConfig(id: string, value: any) {
  await db
    .insert(schema.configs)
    .values({ id, value })
    .onConflictDoUpdate({
      target: schema.configs.id,
      set: { value },
    })
}

// ====================== Schema 元数据 / 分页查询（供 admin 模块使用） ======================

/** 单列元数据 */
export interface ColumnMeta {
  name: string              // DB 列名（如 'created_at'）
  jsName: string            // JS 键名（如 'createdAt'）
  dataType: string          // 'string'|'number'|'date'|'boolean'|'json'|'array'
  columnType: string        // 'PgVarchar'|'PgInteger'|'PgTimestamp'|...
  notNull: boolean
  hasDefault: boolean
  isPrimaryKey: boolean
  isAutoIncrement: boolean
  enumValues?: string[]
  isTimestamp: boolean
  isDeletedAt: boolean
  fkTable?: string          // 启发式检测的外表名
  fkLabel?: string          // 外表用于展示的标签列
}

/** 表元数据 */
export interface TableMeta {
  name: string
  hasId: boolean            // 是否有 id 列（单主键表）
  compositePk: boolean      // 是否复合主键表
  columns: ColumnMeta[]
  labelColumn?: string      // 最佳展示列（'name' > 'title' > 'code' > 'username' > 首个 varchar）
  readOnly: boolean         // 复合主键表为只读
}

/** 单个筛选条件 */
export interface FilterCondition {
  column: string            // jsName
  op: 'eq' | 'ne' | 'contains' | 'gt' | 'lt' | 'gte' | 'lte' | 'in' | 'null' | 'notnull'
  value?: any
}

/** 列表查询参数 */
export interface ListQuery {
  page: number
  pageSize: number
  sort?: { column: string; dir: 'asc' | 'desc' } | null
  search?: string
  filters?: FilterCondition[]
  includeDeleted?: boolean  // true → 仅显示已软删除（垃圾桶）
}

/** 列表查询结果 */
export interface ListResult {
  data: any[]
  total: number
  page: number
  pageSize: number
  columns: ColumnMeta[]
  meta: TableMeta
}

/** 简单英文复数化（覆盖 schema 内所有表名情况） */
function pluralize(word: string): string {
  if (!word) return word
  const lower = word.toLowerCase()
  if (/(s|x|z|ch|sh)$/.test(lower)) return word + 'es'
  if (/[^aeiou]y$/.test(lower)) return word.slice(0, -1) + 'ies'
  return word + 's'
}

/** 已知 FK 标签列覆盖（无 name 列的表） */
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

/** 候选标签列优先级 */
const LABEL_CANDIDATES = ['name', 'title', 'code', 'username']

/**
 * 获取 schema 中所有表名（jsName），排除 withTimestamps / *Relations 等非表导出
 */
export function getSchemaTables(): string[] {
  const tables: string[] = []
  for (const [key, value] of Object.entries(schema)) {
    if (isTable(value)) {
      tables.push(key)
    }
  }
  return tables.sort()
}

/** 构造单列元数据 */
function buildColumnMeta(jsName: string, col: any): ColumnMeta {
  const meta: ColumnMeta = {
    name: col.name,
    jsName,
    dataType: col.dataType,
    columnType: col.columnType,
    notNull: !!col.notNull,
    hasDefault: !!col.hasDefault,
    isPrimaryKey: false,
    isAutoIncrement: col.columnType === 'PgSerial',
    isTimestamp: col.dataType === 'date' || col.columnType === 'PgTimestamp' || col.columnType === 'PgDate',
    isDeletedAt: jsName === 'deletedAt',
  }
  if (col.enumValues && col.enumValues.length) {
    meta.enumValues = col.enumValues
  }
  return meta
}

/**
 * 获取表元数据：列定义、主键判断、FK 启发式检测、标签列
 */
export function getTableMeta(tableName: string): TableMeta {
  const table = getTable(tableName)
  const cols = getTableColumns(table) as Record<string, any>
  const hasId = 'id' in cols
  const compositePk = !hasId

  const columns: ColumnMeta[] = Object.entries(cols).map(([jsName, col]) => {
    const meta = buildColumnMeta(jsName, col)
    meta.isPrimaryKey = hasId ? jsName === 'id' : jsName.endsWith('Id')
    // FK 启发式：jsName 以 Id 结尾 → 去尾 → 复数化 → 校验是否存在于 schema
    if (jsName.endsWith('Id') && jsName.length > 2) {
      const singular = jsName.slice(0, -2) // 去掉 'Id'
      const candidate = pluralize(singular)
      if (candidate in schema && isTable((schema as any)[candidate])) {
        meta.fkTable = candidate
        meta.fkLabel = FK_LABEL_OVERRIDES[candidate] || 'name'
      }
    }
    return meta
  })

  // 标签列：从候选中选第一个存在的列
  let labelColumn: string | undefined
  for (const candidate of LABEL_CANDIDATES) {
    if (candidate in cols) {
      labelColumn = candidate
      break
    }
  }

  return {
    name: tableName,
    hasId,
    compositePk,
    columns,
    labelColumn,
    readOnly: compositePk,
  }
}

/** 获取表的 FK 映射 { [jsName]: { table, labelColumn } } */
export function getFkMap(tableName: string): Record<string, { table: string; labelColumn: string }> {
  const meta = getTableMeta(tableName)
  const map: Record<string, { table: string; labelColumn: string }> = {}
  for (const col of meta.columns) {
    if (col.fkTable) {
      map[col.jsName] = { table: col.fkTable, labelColumn: col.fkLabel || 'name' }
    }
  }
  return map
}

/**
 * 构建 where 条件数组（软删除 / 搜索 / 筛选）
 * 返回 undefined 表示无条件
 */
function _buildWhere(table: any, query?: ListQuery) {
  const cols = getTableColumns(table) as Record<string, any>
  const conditions: any[] = []

  // 软删除过滤
  if ('deletedAt' in cols) {
    if (query?.includeDeleted) {
      conditions.push(isNotNull(cols.deletedAt))
    } else {
      conditions.push(isNull(cols.deletedAt))
    }
  }

  // 全局搜索：label 列 + 前 3 个文本列
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

  // 多条件筛选
  if (query?.filters && query.filters.length > 0) {
    for (const f of query.filters) {
      const col = cols[f.column]
      if (!col) continue
      switch (f.op) {
        case 'eq':
          conditions.push(eq(col, f.value))
          break
        case 'ne':
          conditions.push(sql`${col} != ${f.value}`)
          break
        case 'contains':
          conditions.push(ilike(col, `%${f.value}%`))
          break
        case 'gt':
          conditions.push(sql`${col} > ${f.value}`)
          break
        case 'lt':
          conditions.push(sql`${col} < ${f.value}`)
          break
        case 'gte':
          conditions.push(sql`${col} >= ${f.value}`)
          break
        case 'lte':
          conditions.push(sql`${col} <= ${f.value}`)
          break
        case 'in':
          if (Array.isArray(f.value) && f.value.length > 0) {
            conditions.push(inArray(col, f.value))
          }
          break
        case 'null':
          conditions.push(isNull(col))
          break
        case 'notnull':
          conditions.push(isNotNull(col))
          break
      }
    }
  }

  return conditions.length > 0 ? and(...conditions) : undefined
}

/**
 * 统计符合条件的行数
 */
export async function countTableRows(tableName: string, query?: ListQuery): Promise<number> {
  const table = getTable(tableName)
  const where = _buildWhere(table, query)
  const rows = await db
    .select({ count: sql`count(*)`.as('count') })
    .from(table)
    .where(where ?? sql`true`)
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
    db
      .select()
      .from(table)
      .where(where ?? sql`true`)
      .orderBy(orderBy ?? sql`true`)
      .limit(query.pageSize)
      .offset((query.page - 1) * query.pageSize),
    db
      .select({ count: sql`count(*)`.as('count') })
      .from(table)
      .where(where ?? sql`true`),
  ])

  const total = Number(countRows[0]?.count ?? 0)

  return {
    data,
    total,
    page: query.page,
    pageSize: query.pageSize,
    columns: meta.columns,
    meta,
  }
}

/**
 * 导出表数据（不分页，上限 5000 行）
 */
export async function exportTableRows(tableName: string, query?: Partial<ListQuery>): Promise<any[]> {
  const table = getTable(tableName)
  const where = _buildWhere(table, query as ListQuery | undefined)
  const rows = await db
    .select()
    .from(table)
    .where(where ?? sql`true`)
    .limit(5000)
  return rows
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
      if (!jsName) continue // 跳过未知列
      const colMeta = meta.columns.find((c) => c.jsName === jsName)
      if (!colMeta) continue
      // 自增 id 跳过；其他默认跳过列在为空时跳过
      if (colMeta.isAutoIncrement) continue
      if (skipByDefault.has(jsName) && (val === '' || val === null || val === undefined)) continue
      // 空字符串转 null（非字符串列）
      if (val === '' && colMeta.dataType !== 'string') {
        record[jsName] = null
      } else {
        record[jsName] = val
      }
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
