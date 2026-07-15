import { db, schema } from '@nuxthub/db'
import { eq, and, or } from 'drizzle-orm'

/**
 * Get the current user's bag
 * ?courseId=x returns bag records for global goods (courseId=0) + course-specific goods
 * JOIN goods to include good information
 */
export default eventHandler(async (event) => {
  const user = await requireAuth(event)
  const courseId = Number(getQuery(event).courseId) || 0

  const rows = await db
    .select({
      goodId: schema.bags.goodId,
      quantity: schema.bags.quantity,
      courseId: schema.bags.courseId,
      name: schema.goods.name,
      content: schema.goods.content,
      price: schema.goods.price,
      sellPrice: schema.goods.sellPrice,
      stock: schema.goods.stock,
      type: schema.goods.type,
    })
    .from(schema.bags)
    .innerJoin(schema.goods, eq(schema.bags.goodId, schema.goods.id))
    .where(and(
      eq(schema.bags.userId, user.id),
      or(eq(schema.bags.courseId, 0), eq(schema.bags.courseId, courseId)),
    ))

  return cResp(rows)
})
