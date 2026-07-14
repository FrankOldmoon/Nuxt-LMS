import { db, schema } from '@nuxthub/db'
import { eq } from 'drizzle-orm'
import { canManageExistingGood } from '../../utils/goods/perms'

/** 更新商品（admin/教师） */
export default eventHandler(async (event) => {
  const user = await requireAuth(event)
  const body = await readBody(event)
  const { id, name, content, price, sellPrice, stock, type, order } = body

  if (!id) return cResp(null, '缺少 id 参数', false)
  if (!(await canManageExistingGood(user, Number(id)))) {
    return cResp(null, '无权限：仅管理员或课程教师可操作', false)
  }

  const updateData: any = {}
  if (name !== undefined) updateData.name = name
  if (content !== undefined) updateData.content = content
  if (price !== undefined) updateData.price = Number(price)
  if (sellPrice !== undefined) updateData.sellPrice = Number(sellPrice)
  if (stock !== undefined) updateData.stock = Number(stock)
  if (type !== undefined) updateData.type = type
  if (order !== undefined) updateData.order = Number(order)

  const result = await db.update(schema.goods)
    .set(updateData)
    .where(eq(schema.goods.id, Number(id)))
    .returning()

  return cResp(result[0])
})
