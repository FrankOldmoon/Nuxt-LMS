import { db, schema } from '@nuxthub/db'
import { canManageGoods } from '../../utils/goods/perms'

/** Add good (admin/teacher) */
export default eventHandler(async (event) => {
  const user = await requireAuth(event)
  const body = await readBody(event)
  const { name, content, courseId, price, sellPrice, stock, type, order } = body

  if (!name) return cResp(null, 'Missing name parameter', false)
  const targetCourseId = Number(courseId) || 0
  if (!(await canManageGoods(user, targetCourseId))) {
    return cResp(null, 'No permission: only admin can create global goods, teachers can only create goods for their own courses', false)
  }

  const result = await db.insert(schema.goods).values({
    name,
    content: content || {},
    courseId: targetCourseId,
    price: Number(price) || 0,
    sellPrice: Number(sellPrice) || 0,
    stock: stock !== undefined ? Number(stock) : -1,
    type: type || 'item',
    order: Number(order) || 0,
  }).returning()

  return cResp(result[0])
})
