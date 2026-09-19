import { db } from "@nuxthub/db"
import { eq, inArray } from "drizzle-orm"
import { getTable } from "./_helpers"
import { invalidateAvatarCache } from "../files/avatarGuard"

/** 用户表写入头像时，立刻失效头像路径缓存（避免新头像在 TTL 内被当作普通文件公开） */
function maybeInvalidateAvatarCache(tableName: string, data: Record<string, any>) {
  if (tableName === 'users' && data && 'avatarImg' in data) invalidateAvatarCache()
}

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
  if (!('id' in table)) {
    throw createError({ statusCode: 400, message: `表 ${tableName} 为复合主键表，不支持按 id 查询` })
  }
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
  maybeInvalidateAvatarCache(tableName, data)
  return rows
}

/**
 * 更新记录：按 id 更新指定字段
 * @param id - 记录主键
 * @param data - 要更新的字段（不含 id）
 */
export async function updateTable(tableName: string, id: number, data: Record<string, any>) {
  const table = getTable(tableName)
  if (!('id' in table)) {
    throw createError({ statusCode: 400, message: `表 ${tableName} 为复合主键表，不支持按 id 更新` })
  }
  const result = await db.update(table).set(data).where(eq(table.id, id))
  maybeInvalidateAvatarCache(tableName, data)
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
    throw createError({ statusCode: 400, message: 'ids 不能为空' })
  }
  if (!VALID_ACTIONS.includes(action)) {
    throw createError({
      statusCode: 400,
      message: `无效的 action: ${action}，可选值: ${VALID_ACTIONS.join(', ')}`,
    })
  }

  const table = getTable(tableName)
  if (!('id' in table)) {
    throw createError({ statusCode: 400, message: `表 ${tableName} 为复合主键表，不支持按 id 批量操作` })
  }
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
