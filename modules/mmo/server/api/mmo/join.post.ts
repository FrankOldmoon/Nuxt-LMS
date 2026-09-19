import { db, schema } from '@nuxthub/db'
import { eq } from 'drizzle-orm'

/**
 * 发放一次性 MMO 游戏 token（存入 tokens 表，Colyseus 房间用后即删）
 * 并返回：
 *  - classId：该用户所属班级作为房间号（优先 default_class.id，否则回退 users.class_id）
 *  - courseId：本次游玩绑定的课程（游戏存档与金币都按课程隔离，必填）
 * 玩家只进自己班级的房间；课程成员身份由房间 onJoin 权威校验。
 */
export default eventHandler(async (event) => {
  const user = await requireAuth(event)
  const body = await readBody(event).catch(() => ({}))
  const courseId = Number((body && body.courseId) || getQuery(event).course || 0)
  if (!courseId) return cResp(null, '缺少课程参数(course)', false)

  const rows = await db
    .select({ defaultClass: schema.users.defaultClass, classId: schema.users.classId })
    .from(schema.users)
    .where(eq(schema.users.id, user.id))
    .limit(1)
  const dc = rows[0]?.defaultClass
  const classId = (dc && Number((dc as any).id)) || rows[0]?.classId || 0

  const token = 'mmo:' + crypto.randomUUID().replace(/-/g, '')
  await db.insert(schema.tokens).values({ name: token, userId: user.id })
  return cResp({ token, classId, courseId })
})
