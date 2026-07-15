import { db, schema } from '@nuxthub/db'
import { eq } from 'drizzle-orm'
import { canManageExistingGood } from '../../utils/goods/perms'

/** Update good (admin/teacher) */
export default eventHandler(async (event) => {
  const user = await requireAuth(event)
  const body = await readBody(event)
  const { id, name, content, price, sellPrice, stock, type, order } = body

  if (!id) return cResp(null, 'Missing id parameter', false)
  if (!(await canManageExistingGood(user, Number(id)))) {
    return cResp(null, 'No permission: only admin or course teacher can perform this action', false)
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
