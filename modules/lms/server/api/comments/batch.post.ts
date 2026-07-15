import { db, schema } from "@nuxthub/db"
import { eq, and, or, sql } from "drizzle-orm"

/**
 * Batch operations on comments (composite primary key courseId + cid)
 * body: { rows: { courseId, cid }[], action: 'delete' | 'remove' | 'restore' }
 */
export default eventHandler(async (event) => {
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
    const pkConditions = rows.map((r) =>
      and(eq(schema.comments.courseId, Number(r.courseId)), eq(schema.comments.cid, Number(r.cid))),
    )
    const pkWhere = pkConditions.length > 0 ? or(...pkConditions) : undefined

    if (action === 'delete') {
      const result = await db
        .update(schema.comments)
        .set({ deletedAt: new Date() } as any)
        .where(pkWhere ?? sql`false`)
      return cResp({ count: rows.length, result })
    } else if (action === 'remove') {
      const result = await db
        .delete(schema.comments)
        .where(pkWhere ?? sql`false`)
      return cResp({ count: rows.length, result })
    } else {
      const result = await db
        .update(schema.comments)
        .set({ deletedAt: null } as any)
        .where(pkWhere ?? sql`false`)
      return cResp({ count: rows.length, result })
    }
  } catch (error: any) {
    console.error(`comments batch [${action}] operation failed:`, error)
    return cResp(null, error.message || 'comments batch operation failed', false)
  }
})
