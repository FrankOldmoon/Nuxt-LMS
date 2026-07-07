import { db, schema } from '@nuxthub/db'
import { eq } from 'drizzle-orm'

/** 获取当前用户已获得的奖章 */
export default eventHandler(async (event) => {
  const user = await requireAuth(event)
  const rows = await db
    .select({
      medalId: schema.userMedals.medalId,
      name: schema.medals.name,
      content: schema.medals.content,
      createdAt: schema.userMedals.createdAt,
    })
    .from(schema.userMedals)
    .innerJoin(schema.medals, eq(schema.userMedals.medalId, schema.medals.id))
    .where(eq(schema.userMedals.userId, user.id))

  return cResp(rows)
})
