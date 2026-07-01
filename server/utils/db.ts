import { db, schema } from "@nuxthub/db"
import { eq, inArray } from "drizzle-orm"

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
