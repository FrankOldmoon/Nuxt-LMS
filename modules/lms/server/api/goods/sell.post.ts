import { db, schema } from '@nuxthub/db'
import { eq, and, sql, gt } from 'drizzle-orm'

/**
 * 卖出商品
 * body: { goodId, paidCourseId }
 * - goodId: 商品 ID
 * - paidCourseId: 返还 coin 的课程上下文（=当前浏览课程）
 *
 * 卖出返还 good.sellPrice 个 coin 到 paidCourseId 的 user_courses
 */
export default eventHandler(async (event) => {
  const user = await requireAuth(event)
  const body = await readBody(event)
  const goodId = Number(body.goodId)
  const paidCourseId = Number(body.paidCourseId)

  if (!goodId || !paidCourseId) {
    return cResp(null, '缺少 goodId 或 paidCourseId 参数', false)
  }

  // 1. 查商品
  const goodRows = await db.select().from(schema.goods).where(eq(schema.goods.id, goodId)).limit(1)
  if (!goodRows[0]) return cResp(null, '商品不存在', false)
  const good = goodRows[0]

  // 2. 查 bag，校验拥有
  const bagRows = await db
    .select()
    .from(schema.bags)
    .where(and(eq(schema.bags.userId, user.id), eq(schema.bags.goodId, goodId), eq(schema.bags.courseId, good.courseId)))
    .limit(1)
  if (!bagRows[0] || bagRows[0].quantity <= 0) {
    return cResp(null, '背包中无此商品', false)
  }
  const bag = bagRows[0]

  // 3. 查 userCourses 获取当前 coin
  const ucRows = await db
    .select()
    .from(schema.userCourses)
    .where(and(eq(schema.userCourses.userId, user.id), eq(schema.userCourses.courseId, paidCourseId)))
    .limit(1)
  if (!ucRows[0]) return cResp(null, '未加入该课程', false)

  // 4. 交易：原子减 bag + 加 coin + 加库存
  //    并发安全：背包数量在事务内用条件更新原子递减，防止并发重复卖出刷金币
  //    防套利兜底：卖出返还不超过买入价（add/update 已限制 sellPrice<=price，
  //    这里对存量异常数据也做运行时 clamp，杜绝买→卖无限刷金币）
  const refund = Number(good.sellPrice) > Number(good.price)
    ? Math.max(0, Number(good.price) || 0)
    : (Number(good.sellPrice) || 0)
  let newCoin = 0
  let newQuantity = 0
  try {
    await db.transaction(async (tx) => {
      const updated = await tx.update(schema.bags)
        .set({ quantity: sql`${schema.bags.quantity} - 1` })
        .where(and(
          eq(schema.bags.userId, user.id),
          eq(schema.bags.goodId, goodId),
          eq(schema.bags.courseId, good.courseId),
          gt(schema.bags.quantity, 0),
        ))
        .returning({ quantity: schema.bags.quantity })
      if (!updated[0]) throw new Error('背包中无此商品')
      newQuantity = Number(updated[0].quantity) || 0

      if (newQuantity <= 0) {
        await tx.delete(schema.bags)
          .where(and(eq(schema.bags.userId, user.id), eq(schema.bags.goodId, goodId), eq(schema.bags.courseId, good.courseId)))
      }

      const coinUpdated = await tx.update(schema.userCourses)
        .set({ coin: sql`${schema.userCourses.coin} + ${refund}` })
        .where(and(eq(schema.userCourses.userId, user.id), eq(schema.userCourses.courseId, paidCourseId)))
        .returning({ coin: schema.userCourses.coin })
      newCoin = Number(coinUpdated[0]?.coin) || 0

      if (good.stock !== -1) {
        await tx.update(schema.goods)
          .set({ stock: sql`${schema.goods.stock} + 1` })
          .where(eq(schema.goods.id, goodId))
      }
    })
  } catch (error: any) {
    return cResp(null, error?.message || '卖出失败', false)
  }

  return cResp({ coin: newCoin, quantity: Math.max(0, newQuantity) })
})
