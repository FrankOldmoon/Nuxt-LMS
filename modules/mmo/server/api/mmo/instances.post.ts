// POST /api/mmo/instances —— 教师/管理员上传(upsert)一个副本定义
// body: { json: { id, name, description?, map, npcs?, monsters?, tasks? } }
import { db, schema } from '@nuxthub/db'
import { eq, and } from 'drizzle-orm'

export default eventHandler(async (event) => {
  const user = await requireRole(event, ['teacher', 'admin'])
  const body = await readBody(event).catch(() => null)
  if (!body || typeof body !== 'object' || !body.json) return cResp(null, '缺少副本定义 json', false)

  const json = body.json
  if (typeof json.id !== 'string' || !json.id) return cResp(null, '副本 id 缺失', false)
  if (!/^[a-zA-Z0-9_]{1,48}$/.test(json.id)) return cResp(null, '副本 id 仅限字母/数字/下划线(≤48)', false)
  if (typeof json.name !== 'string' || !json.name) return cResp(null, '副本名称缺失', false)
  if (!json.map || !json.map.file || !json.map.tex) return cResp(null, '副本地图配置(map.file/map.tex)缺失', false)

  const rows = await db
    .select({ defaultClass: schema.users.defaultClass, classId: schema.users.classId })
    .from(schema.users)
    .where(eq(schema.users.id, user.id))
    .limit(1)
  const dc = rows[0]?.defaultClass
  const classId = (dc && Number((dc as any).id)) || rows[0]?.classId || 0

  const id = json.id
  const data: any = {
    id,
    classId,
    name: String(json.name).slice(0, 120),
    description: json.description ? String(json.description).slice(0, 500) : null,
    json,
    createdBy: user.id,
  }

  const existing = await db
    .select()
    .from(schema.mmoInstance)
    .where(eq(schema.mmoInstance.id, id))
    .limit(1)
  if (existing[0]) {
    // id 为全局主键：若已被其它班级占用，返回友好错误，避免覆盖或主键冲突 500
    if (existing[0].classId !== classId) return cResp(null, '副本 id 已被其它班级占用', false)
    await db
      .update(schema.mmoInstance)
      .set(data)
      .where(and(eq(schema.mmoInstance.id, id), eq(schema.mmoInstance.classId, classId)))
  } else {
    await db.insert(schema.mmoInstance).values(data)
  }

  return cResp({ id, name: data.name })
})
