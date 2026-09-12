import { db, schema } from '@nuxthub/db'
import { eq, and, sql, gt } from 'drizzle-orm'

/**
 * 佩戴/取消佩戴头像框
 * POST /api/users/avatar-frame
 *   body: { frame: 'bronze' | 'silver' | 'gold' | null }
 *
 * 仅可佩戴自己拥有的头像框商品（goods.type='avatar_frame' 且 content.frame 匹配）。
 */
const VALID_FRAMES = ['bronze', 'silver', 'gold']

export default eventHandler(async (event) => {
  const user = await requireAuth(event)
  const body = await readBody(event)
  const frame = body?.frame ?? null

  if (frame !== null && !VALID_FRAMES.includes(frame)) {
    return cResp(null, '非法头像框', false)
  }

  // 佩戴时校验已拥有对应商品（全局商品 courseId=0）
  if (frame !== null) {
    const owned = await db
      .select({ userId: schema.bags.userId })
      .from(schema.bags)
      .innerJoin(schema.goods, eq(schema.bags.goodId, schema.goods.id))
      .where(and(
        eq(schema.bags.userId, user.id),
        eq(schema.goods.type, 'avatar_frame'),
        eq(schema.goods.courseId, 0),
        sql`${schema.goods.content}->>'frame' = ${frame}`,
        gt(schema.bags.quantity, 0),
      ))
      .limit(1)
    if (!owned[0]) return cResp(null, '未拥有该头像框', false)
  }

  await db.update(schema.users)
    .set({ avatarFrame: frame })
    .where(eq(schema.users.id, user.id))

  return cResp({ frame })
})
