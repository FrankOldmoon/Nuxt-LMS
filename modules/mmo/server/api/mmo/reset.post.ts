import { db, schema } from '@nuxthub/db'
import { and, eq } from 'drizzle-orm'

/**
 * 重置当前用户在指定课程下的 MMO 存档（删除对应 game_info 记录）
 * 下次进入该课程的游戏会重新走角色创建页；其它课程的存档不受影响。
 */
export default eventHandler(async (event) => {
  const user = await requireAuth(event)
  const body = await readBody(event).catch(() => ({}))
  const courseId = Number((body && body.courseId) || getQuery(event).course || 0)
  if (!courseId) return cResp(null, '缺少课程参数(course)', false)

  await db
    .delete(schema.gameInfo)
    .where(and(eq(schema.gameInfo.userId, user.id), eq(schema.gameInfo.courseId, courseId)))
  return cResp({ ok: true })
})
