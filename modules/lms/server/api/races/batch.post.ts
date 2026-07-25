import { db, schema } from "@nuxthub/db"
import { eq, and, or, sql } from "drizzle-orm"

/**
 * races 批量操作（复合主键 courseId + cid）
 * body: { rows: { courseId, cid }[], action: 'delete' | 'remove' | 'restore' }
 */
export default eventHandler(async (event) => {
  await requireAdmin(event)

  const body = await readBody(event)
  const { rows, action } = body as { rows: { courseId: number; cid: number }[]; action: string }

  if (!rows || !Array.isArray(rows) || rows.length === 0) {
    return cResp(null, 'rows 不能为空', false)
  }
  if (!['delete', 'remove', 'restore'].includes(action)) {
    return cResp(null, `无效的 action: ${action}`, false)
  }

  try {
    const pkConditions = rows.map((r) =>
      and(eq(schema.races.courseId, Number(r.courseId)), eq(schema.races.cid, Number(r.cid))),
    )
    const pkWhere = pkConditions.length > 0 ? or(...pkConditions) : undefined

    if (action === 'delete') {
      const result = await db
        .update(schema.races)
        .set({ deletedAt: new Date() } as any)
        .where(pkWhere ?? sql`false`)
      return cResp({ count: rows.length, result })
    } else if (action === 'remove') {
      const result = await db
        .delete(schema.races)
        .where(pkWhere ?? sql`false`)
      return cResp({ count: rows.length, result })
    } else {
      const result = await db
        .update(schema.races)
        .set({ deletedAt: null } as any)
        .where(pkWhere ?? sql`false`)
      return cResp({ count: rows.length, result })
    }
  } catch (error: any) {
    console.error(`races 批量[${action}]操作失败:`, error)
    return cResp(null, error.message || 'races 批量操作失败', false)
  }
})
