import { db, schema } from '@nuxthub/db'
import { eq, or } from 'drizzle-orm'
import { canManageGoods } from '../../utils/goods/perms'

/**
 * Get list of manageable goods (for admin/teacher)
 * - admin: when ?courseId=x returns global + that course; if courseId is not provided, returns all
 * - teacher: ?courseId=x returns global + that course (only own courses)
 */
export default eventHandler(async (event) => {
  const user = await requireAuth(event)
  const courseId = Number(getQuery(event).courseId) || 0

  if (courseId === 0 && !user.roles.includes('admin')) {
    return cResp(null, 'No permission: only admin can view all goods', false)
  }
  if (courseId > 0 && !(await canManageGoods(user, courseId))) {
    return cResp(null, 'No permission: only admin or course teacher can perform this action', false)
  }

  let rows: any[]
  if (courseId > 0) {
    rows = await db.select().from(schema.goods)
      .where(or(eq(schema.goods.courseId, 0), eq(schema.goods.courseId, courseId)))
      .orderBy(schema.goods.order)
  } else {
    rows = await db.select().from(schema.goods).orderBy(schema.goods.order)
  }

  return cResp(rows)
})
