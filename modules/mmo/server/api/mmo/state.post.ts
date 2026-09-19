import { db, schema } from '@nuxthub/db'
import { and, eq } from 'drizzle-orm'

/**
 * 保存当前用户在指定课程下的 MMO 存档（game_info）
 * body 可包含任意合法字段，仅写入白名单字段，其余忽略。
 * 游戏数据与课程绑定：按 (userId, courseId) 定位存档，courseId 必填。
 */
export default eventHandler(async (event) => {
  const user = await requireAuth(event)
  const body = await readBody(event).catch(() => ({}))
  if (!body || typeof body !== 'object') return cResp(null, '参数格式错误', false)

  const courseId = Number(body.courseId || getQuery(event).course || 0)
  if (!courseId) return cResp(null, '缺少课程参数(course)', false)

  // 安全：仅允许写入外观/昵称(name/cfg)。所有数值字段(gold/xp/level/inventory/
  // equipped/hp/坐标/mapId/tasks 等)一律由 Colyseus 权威服务器维护，
  // 金币则由课程(user_courses.coin)维护，禁止经 REST 端点直接改写。
  const patch: any = {}
  if (typeof body.name === 'string') patch.name = body.name.slice(0, 50) || '玩家'
  if (body.cfg && typeof body.cfg === 'object') patch.cfg = body.cfg

  if (Object.keys(patch).length === 0) return cResp(null, '没有可保存的字段', false)

  const where = and(eq(schema.gameInfo.userId, user.id), eq(schema.gameInfo.courseId, courseId))
  const existing = await db.select().from(schema.gameInfo).where(where).limit(1)
  if (existing[0]) {
    await db.update(schema.gameInfo).set(patch).where(where)
  } else {
    // 新建存档（首次创建角色）：昵称直接取账号名；所在地图 mapId 缺省 world，
    // 显式指定以绕开既有 DB 列的旧默认值(outdoor)
    patch.mapId ??= 'world'
    await db.insert(schema.gameInfo).values({ userId: user.id, courseId, name: user.name || '玩家', ...patch })
  }

  const row = (await db.select().from(schema.gameInfo).where(where).limit(1))[0]
  return cResp(row)
})
