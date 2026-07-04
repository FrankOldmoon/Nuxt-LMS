import { db, schema } from '@nuxthub/db'
import { eq } from 'drizzle-orm'

/** 获取所有奖章列表 */
export default eventHandler(async (event) => {
  const medals = await db.select().from(schema.medals)
  return cResp(medals)
})
