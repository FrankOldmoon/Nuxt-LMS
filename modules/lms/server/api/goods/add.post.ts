import { db, schema } from '@nuxthub/db'
import { canManageGoods } from '../../utils/goods/perms'

/** 新增商品（admin/教师） */
export default eventHandler(async (event) => {
  const user = await requireAuth(event)
  const body = await readBody(event)
  const { name, content, courseId, price, sellPrice, stock, type, order } = body

  if (!name) return cResp(null, '缺少 name 参数', false)
  const targetCourseId = Number(courseId) || 0
  if (!(await canManageGoods(user, targetCourseId))) {
    return cResp(null, '无权限：仅管理员可创建全局商品，教师仅可创建本课程商品', false)
  }

  // 防套利：卖出价不得高于买入价（否则可反复买卖无限刷金币）
  const numPrice = Number(price) || 0
  const numSellPrice = Number(sellPrice) || 0
  if (numSellPrice > numPrice) {
    return cResp(null, '卖出价不能高于买入价', false)
  }

  const result = await db.insert(schema.goods).values({
    name,
    content: content || {},
    courseId: targetCourseId,
    price: numPrice,
    sellPrice: numSellPrice,
    stock: stock !== undefined ? Number(stock) : -1,
    type: type || 'item',
    order: Number(order) || 0,
  }).returning()

  return cResp(result[0])
})
