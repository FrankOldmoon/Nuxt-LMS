import { db, schema } from "@nuxthub/db"
import { eq, and, or, isNull, isNotNull } from "drizzle-orm"

/**
 * Questions batch operation (composite primary key courseId + cid)
 * body: { rows: { courseId, cid }[], action: 'delete' | 'remove' | 'restore' }
 *
 * - delete: soft delete (set deleted_at = now())
 * - remove: hard delete
 * - restore: restore soft-deleted record (deleted_at = null)
 */
export default eventHandler(async (event) => {
  // Only admins can perform batch operations
  await requireAdmin(event)

  const body = await readBody(event)
  const { rows, action } = body as { rows: { courseId: number; cid: number }[]; action: string }

  if (!rows || !Array.isArray(rows) || rows.length === 0) {
    return cResp(null, 'rows cannot be empty', false)
  }
  if (!['delete', 'remove', 'restore'].includes(action)) {
    return cResp(null, `Invalid action: ${action}`, false)
  }

  try {
    // Build composite primary key OR conditions
    const pkConditions = rows.map((r) =>
      and(eq(schema.questions.courseId, Number(r.courseId)), eq(schema.questions.cid, Number(r.cid))),
    )
    const pkWhere = pkConditions.length > 0 ? or(...pkConditions) : undefined

    if (action === 'delete') {
      const result = await db
        .update(schema.questions)
        .set({ deletedAt: new Date() } as any)
        .where(pkWhere ?? sql`false`)
      return cResp({ count: rows.length, result })
    } else if (action === 'remove') {
      const result = await db
        .delete(schema.questions)
        .where(pkWhere ?? sql`false`)
      return cResp({ count: rows.length, result })
    } else {
      // restore
      const result = await db
        .update(schema.questions)
        .set({ deletedAt: null } as any)
        .where(pkWhere ?? sql`false`)
      return cResp({ count: rows.length, result })
    }
  } catch (error: any) {
    console.error(`Questions batch [${action}] operation failed:`, error)
    return cResp(null, error.message || 'Questions batch operation failed', false)
  }
})
