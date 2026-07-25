import { db, schema } from '@nuxthub/db'
import { eq, or } from 'drizzle-orm'

/**
 * 获取商店商品列表（学生浏览用）
 * ?courseId=x 返回全局商品（courseId=0）+ 该课程专属商品
 */
export default eventHandler(async (event) => {
  await requireAuth(event)
  const courseId = Number(getQuery(event).courseId) || 0

  const rows = await db
    .select()
    .from(schema.goods)
    .where(or(eq(schema.goods.courseId, 0), eq(schema.goods.courseId, courseId)))
    .orderBy(schema.goods.order)

  return cResp(rows)
})
