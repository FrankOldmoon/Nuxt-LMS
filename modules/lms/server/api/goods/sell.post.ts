import { db, schema } from '@nuxthub/db'
import { eq, and } from 'drizzle-orm'

/**
 * Sell good
 * body: { goodId, paidCourseId }
 * - goodId: good ID
 * - paidCourseId: course context for coin refund (= currently viewed course)
 *
 * Selling refunds good.sellPrice coins to the user_courses of paidCourseId
 */
export default eventHandler(async (event) => {
  const user = await requireAuth(event)
  const body = await readBody(event)
  const goodId = Number(body.goodId)
  const paidCourseId = Number(body.paidCourseId)

  if (!goodId || !paidCourseId) {
    return cResp(null, 'Missing goodId or paidCourseId parameter', false)
  }

  // 1. Query good
  const goodRows = await db.select().from(schema.goods).where(eq(schema.goods.id, goodId)).limit(1)
  if (!goodRows[0]) return cResp(null, 'Good does not exist', false)
  const good = goodRows[0]

  // 2. Query bag and verify ownership
  const bagRows = await db
    .select()
    .from(schema.bags)
    .where(and(eq(schema.bags.userId, user.id), eq(schema.bags.goodId, goodId), eq(schema.bags.courseId, good.courseId)))
    .limit(1)
  if (!bagRows[0] || bagRows[0].quantity <= 0) {
    return cResp(null, 'Good not found in bag', false)
  }
  const bag = bagRows[0]

  // 3. Query userCourses to get current coin
  const ucRows = await db
    .select()
    .from(schema.userCourses)
    .where(and(eq(schema.userCourses.userId, user.id), eq(schema.userCourses.courseId, paidCourseId)))
    .limit(1)
  if (!ucRows[0]) return cResp(null, 'Not enrolled in this course', false)
  const uc = ucRows[0]

  // 4. Transaction: add coin + decrease bag + increase stock
  const newCoin = (uc.coin || 0) + good.sellPrice
  const newQuantity = bag.quantity - 1
  await db.transaction(async (tx) => {
    await tx.update(schema.userCourses)
      .set({ coin: newCoin })
      .where(and(eq(schema.userCourses.userId, user.id), eq(schema.userCourses.courseId, paidCourseId)))

    if (newQuantity <= 0) {
      await tx.delete(schema.bags)
        .where(and(eq(schema.bags.userId, user.id), eq(schema.bags.goodId, goodId), eq(schema.bags.courseId, good.courseId)))
    } else {
      await tx.update(schema.bags)
        .set({ quantity: newQuantity })
        .where(and(eq(schema.bags.userId, user.id), eq(schema.bags.goodId, goodId), eq(schema.bags.courseId, good.courseId)))
    }

    if (good.stock !== -1) {
      await tx.update(schema.goods)
        .set({ stock: good.stock + 1 })
        .where(eq(schema.goods.id, goodId))
    }
  })

  return cResp({ coin: newCoin, quantity: Math.max(0, newQuantity) })
})
