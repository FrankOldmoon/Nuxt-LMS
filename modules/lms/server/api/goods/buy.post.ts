import { db, schema } from '@nuxthub/db'
import { eq, and, sql, gte, gt } from 'drizzle-orm'

/**
 * 购买商品
 * body: { goodId, paidCourseId }
 * - goodId: 商品 ID
 * - paidCourseId: 支付 coin 的课程上下文（=当前浏览课程）
 *
 * 全局商品（courseId=0）可从任意课程购买；课程专属商品要求 paidCourseId === good.courseId
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

  // 2. 校验商品属于当前课程或全局
  if (good.courseId !== 0 && good.courseId !== paidCourseId) {
    return cResp(null, '该商品不属于当前课程', false)
  }

  // 3. 校验库存
  if (good.stock !== -1 && good.stock <= 0) {
    return cResp(null, '库存不足', false)
  }

  // 4. 查 userCourses，校验已加入课程
  const ucRows = await db
    .select()
    .from(schema.userCourses)
    .where(and(eq(schema.userCourses.userId, user.id), eq(schema.userCourses.courseId, paidCourseId)))
    .limit(1)
  if (!ucRows[0]) return cResp(null, '未加入该课程', false)

  // 5. 事务：原子扣 coin + upsert bag + 原子减库存
  //    并发安全：余额与库存均在事务内用条件更新判断，防止双重扣款/超卖
  let newCoin = 0
  try {
    await db.transaction(async (tx) => {
      const updated = await tx.update(schema.userCourses)
        .set({ coin: sql`${schema.userCourses.coin} - ${good.price}` })
        .where(and(
          eq(schema.userCourses.userId, user.id),
          eq(schema.userCourses.courseId, paidCourseId),
          gte(schema.userCourses.coin, good.price),
        ))
        .returning({ coin: schema.userCourses.coin })
      if (!updated[0]) throw new Error('金币不足')
      newCoin = Number(updated[0].coin) || 0

      await tx.insert(schema.bags)
        .values({ userId: user.id, goodId, courseId: good.courseId, quantity: 1 })
        .onConflictDoUpdate({
          target: [schema.bags.userId, schema.bags.goodId, schema.bags.courseId],
          set: { quantity: sql`${schema.bags.quantity} + 1` },
        })

      if (good.stock !== -1) {
        const stockUpdated = await tx.update(schema.goods)
          .set({ stock: sql`${schema.goods.stock} - 1` })
          .where(and(eq(schema.goods.id, goodId), gt(schema.goods.stock, 0)))
          .returning({ id: schema.goods.id })
        if (!stockUpdated[0]) throw new Error('库存不足')
      }
    })
  } catch (error: any) {
    return cResp(null, error?.message || '购买失败', false)
  }

  // 6. 查最新 bag 数量
  const bagRows = await db
    .select({ quantity: schema.bags.quantity })
    .from(schema.bags)
    .where(and(eq(schema.bags.userId, user.id), eq(schema.bags.goodId, goodId), eq(schema.bags.courseId, good.courseId)))
    .limit(1)

  return cResp({ coin: newCoin, quantity: bagRows[0]?.quantity || 0 })
})
