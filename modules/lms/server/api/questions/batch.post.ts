import { db, schema } from "@nuxthub/db"
import { eq, and, or, isNull, isNotNull } from "drizzle-orm"

/**
 * questions 批量操作（复合主键 courseId + cid）
 * body: { rows: { courseId, cid }[], action: 'delete' | 'remove' | 'restore' }
 *
 * - delete: 软删除（设置 deleted_at = now()）
 * - remove: 硬删除
 * - restore: 恢复软删除（deleted_at = null）
 */
export default eventHandler(async (event) => {
  // 仅管理员可批量操作
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
    // 构造复合主键 OR 条件
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
    console.error(`questions 批量[${action}]操作失败:`, error)
    return cResp(null, error.message || 'questions 批量操作失败', false)
  }
})
