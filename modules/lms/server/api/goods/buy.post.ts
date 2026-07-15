import { db, schema } from '@nuxthub/db'
import { eq, and, sql } from 'drizzle-orm'

/**
 * Buy good
 * body: { goodId, paidCourseId }
 * - goodId: good ID
 * - paidCourseId: course context for coin payment (= currently viewed course)
 *
 * Global goods (courseId=0) can be purchased from any course; course-specific goods require paidCourseId === good.courseId
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

  // 2. Verify the good belongs to the current course or is global
  if (good.courseId !== 0 && good.courseId !== paidCourseId) {
    return cResp(null, 'Good does not belong to the current course', false)
  }

  // 3. Verify stock
  if (good.stock !== -1 && good.stock <= 0) {
    return cResp(null, 'Insufficient stock', false)
  }

  // 4. Query userCourses and verify coin
  const ucRows = await db
    .select()
    .from(schema.userCourses)
    .where(and(eq(schema.userCourses.userId, user.id), eq(schema.userCourses.courseId, paidCourseId)))
    .limit(1)
  if (!ucRows[0]) return cResp(null, 'Not enrolled in this course', false)
  const uc = ucRows[0]
  if ((uc.coin || 0) < good.price) {
    return cResp(null, 'Insufficient coins', false)
  }

  // 5. Transaction: deduct coin + upsert bag + decrease stock
  const newCoin = (uc.coin || 0) - good.price
  await db.transaction(async (tx) => {
    await tx.update(schema.userCourses)
      .set({ coin: newCoin })
      .where(and(eq(schema.userCourses.userId, user.id), eq(schema.userCourses.courseId, paidCourseId)))

    await tx.insert(schema.bags)
      .values({ userId: user.id, goodId, courseId: good.courseId, quantity: 1 })
      .onConflictDoUpdate({
        target: [schema.bags.userId, schema.bags.goodId, schema.bags.courseId],
        set: { quantity: sql`${schema.bags.quantity} + 1` },
      })

    if (good.stock !== -1) {
      await tx.update(schema.goods)
        .set({ stock: good.stock - 1 })
        .where(eq(schema.goods.id, goodId))
    }
  })

  // 6. Query the latest bag quantity
  const bagRows = await db
    .select({ quantity: schema.bags.quantity })
    .from(schema.bags)
    .where(and(eq(schema.bags.userId, user.id), eq(schema.bags.goodId, goodId), eq(schema.bags.courseId, good.courseId)))
    .limit(1)

  return cResp({ coin: newCoin, quantity: bagRows[0]?.quantity || 0 })
})
