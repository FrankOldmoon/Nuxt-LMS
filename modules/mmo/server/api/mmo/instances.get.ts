// GET /api/mmo/instances —— 列出当前用户班级下所有教师编排的副本
import { db, schema } from '@nuxthub/db'
import { eq } from 'drizzle-orm'

export default eventHandler(async (event) => {
  const user = await requireAuth(event)
  // includeExt=1：连外部副本(ext_ 前缀)一起返回。
  // 仅用于客户端启动预注册(刷新/重连回到所在副本)，"副本入口"列表仍不传该参数。
  const includeExt = ['1', 'true'].includes(String(getQuery(event).includeExt || ''))
  const rows = await db
    .select({ defaultClass: schema.users.defaultClass, classId: schema.users.classId })
    .from(schema.users)
    .where(eq(schema.users.id, user.id))
    .limit(1)
  const dc = rows[0]?.defaultClass
  const classId = (dc && Number((dc as any).id)) || rows[0]?.classId || 0

  const list = await db
    .select()
    .from(schema.mmoInstance)
    .where(eq(schema.mmoInstance.classId, classId))

  // 外部副本（ext_ 前缀，由 ?json= 链接加载）默认不出现在"副本入口"列表与教师后台，
  // 玩家通过分享链接直接进入；includeExt=1 时才一并返回（供启动预注册）。
  return cResp(list.filter((r) => includeExt || !String(r.id).startsWith('ext_')).map((r) => ({
    id: r.id,
    name: r.name,
    description: r.description,
    json: typeof r.json === 'string' ? JSON.parse(r.json) : r.json,
    createdAt: r.createdAt,
  })))
})
