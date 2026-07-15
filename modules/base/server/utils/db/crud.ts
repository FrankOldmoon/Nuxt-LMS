import { db } from "@nuxthub/db"
import { eq, inArray } from "drizzle-orm"
import { getTable } from "./_helpers"

/**
 * List query: get all records in a table
 * @example listTable('categories') // => all categories
 */
export async function listTable(tableName: string) {
  const table = getTable(tableName)
  return db.select().from(table)
}

/**
 * Single query: get record by id
 * @example showTable('courses', 1) // => course with id=1
 */
export async function showTable(tableName: string, id: number) {
  const table = getTable(tableName)
  if (!('id' in table)) {
    throw createError({ statusCode: 400, message: `Table ${tableName} is a composite primary key table, querying by id is not supported` })
  }
  const rows = await db.select().from(table).where(eq(table.id, id)).limit(1)
  return rows[0] ?? null
}

/**
 * Add record
 * @returns the record returned after insertion
 */
export async function addTable(tableName: string, data: Record<string, any>) {
  const table = getTable(tableName)
  const rows = await db.insert(table).values(data).returning()
  return rows
}

/**
 * Update record: update specified fields by id
 * @param id - record primary key
 * @param data - fields to update (excluding id)
 */
export async function updateTable(tableName: string, id: number, data: Record<string, any>) {
  const table = getTable(tableName)
  if (!('id' in table)) {
    throw createError({ statusCode: 400, message: `Table ${tableName} is a composite primary key table, updating by id is not supported` })
  }
  const result = await db.update(table).set(data).where(eq(table.id, id))
  return result
}

// ====================== Batch operations ======================

export type BatchAction = 'delete' | 'remove' | 'restore'

const VALID_ACTIONS: BatchAction[] = ['delete', 'remove', 'restore']

/**
 * Batch operations
 * - delete: soft delete (set deleted_at)
 * - remove: hard delete (physical delete)
 * - restore: restore soft-deleted (clear deleted_at)
 */
export async function batchTable(
  tableName: string,
  ids: number[],
  action: BatchAction,
) {
  if (!ids || !Array.isArray(ids) || ids.length === 0) {
    throw createError({ statusCode: 400, message: 'ids cannot be empty' })
  }
  if (!VALID_ACTIONS.includes(action)) {
    throw createError({
      statusCode: 400,
      message: `Invalid action: ${action}, valid values: ${VALID_ACTIONS.join(', ')}`,
    })
  }

  const table = getTable(tableName)
  if (!('id' in table)) {
    throw createError({ statusCode: 400, message: `Table ${tableName} is a composite primary key table, batch operations by id are not supported` })
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
