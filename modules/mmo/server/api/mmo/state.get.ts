import { db, schema } from '@nuxthub/db'
import { and, eq } from 'drizzle-orm'

/**
 * 读取当前用户在指定课程下的 MMO 存档（game_info）
 * 游戏数据与课程绑定：每门课一份存档，必须带课程参数（?course=<courseId>）。
 * 无存档时不自动创建，返回 null —— 前端据此进入角色创建页。
 */
export default eventHandler(async (event) => {
  const user = await requireAuth(event)
  const courseId = Number(getQuery(event).course || getQuery(event).courseId || 0)
  if (!courseId) return cResp(null, '缺少课程参数(course)', false)

  const rows = await db
    .select()
    .from(schema.gameInfo)
    .where(and(eq(schema.gameInfo.userId, user.id), eq(schema.gameInfo.courseId, courseId)))
    .limit(1)
  return cResp(rows[0] || null)
})
