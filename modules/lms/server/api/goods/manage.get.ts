import { db, schema } from '@nuxthub/db'
import { eq, or } from 'drizzle-orm'
import { canManageGoods } from '../../utils/goods/perms'

/**
 * 获取可管理的商品列表（admin/教师用）
 * - admin：?courseId=x 时返回全局+该课程；不传 courseId 返回全部
 * - 教师：?courseId=x 返回全局+该课程（仅自己课程）
 */
export default eventHandler(async (event) => {
  const user = await requireAuth(event)
  const courseId = Number(getQuery(event).courseId) || 0

  if (courseId === 0 && !user.roles.includes('admin')) {
    return cResp(null, '无权限：仅管理员可查看全部商品', false)
  }
  if (courseId > 0 && !(await canManageGoods(user, courseId))) {
    return cResp(null, '无权限：仅管理员或课程教师可操作', false)
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
