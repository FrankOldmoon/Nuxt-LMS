// POST /api/mmo/instances/from-url —— 通过 json 链接加载外部副本
// 由 MMO 页面 ?json=<url> 触发：服务端拉取该 JSON（避开浏览器 CORS），校验结构后
// 按当前用户班级持久化为一个"外部副本"实例，供 GameRoom 权威加载任务与怪物/掉落结算。
// body: { url: string }
import { db, schema } from '@nuxthub/db'
import { eq } from 'drizzle-orm'

function isHttpUrl(s: any): boolean {
  if (typeof s !== 'string') return false
  try {
    const u = new URL(s)
    return u.protocol === 'http:' || u.protocol === 'https:'
  } catch { return false }
}

// 仅保留 url-safe 字符，并限长，避免 id 注入
function safeId(s: string): string {
  return s.replace(/[^a-zA-Z0-9_]/g, '').slice(0, 40)
}

export default eventHandler(async (event) => {
  const user = await requireAuth(event)
  const body = await readBody(event).catch(() => null)
  const url = body && body.url
  if (!isHttpUrl(url)) return cResp(null, '缺少或非法的 json 链接（需 http/https）', false)

  // 服务端拉取 JSON（比浏览器直接 fetch 更稳：不受 CORS 限制，且可先校验再入库）
  let json: any
  try {
    const resp = await fetch(url, { redirect: 'follow' })
    if (!resp.ok) return cResp(null, '下载 json 失败：HTTP ' + resp.status, false)
    json = await resp.json()
  } catch (e: any) {
    return cResp(null, '下载 json 失败：' + (e && e.message ? e.message : e), false)
  }
  if (!json || typeof json !== 'object') return cResp(null, 'json 内容非法', false)
  if (!json.map || !json.map.file || !json.map.tex) return cResp(null, '副本地图配置（map.file / map.tex）缺失', false)

  // 副本 id：优先用 json.id（加 ext_ 前缀避免与教师实例冲突），否则由 url 派生稳定 id
  const rawId = (typeof json.id === 'string' && /^[a-zA-Z0-9_]{1,48}$/.test(json.id))
    ? json.id
    : safeId(Buffer.from(url).toString('base64'))
  const id = 'ext_' + rawId
  if (typeof json.name !== 'string' || !json.name) json.name = '外部副本'

  const rows = await db
    .select({ defaultClass: schema.users.defaultClass, classId: schema.users.classId })
    .from(schema.users)
    .where(eq(schema.users.id, user.id))
    .limit(1)
  const dc = rows[0]?.defaultClass
  const classId = (dc && Number((dc as any).id)) || rows[0]?.classId || 0

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
    await db.update(schema.mmoInstance).set(data).where(eq(schema.mmoInstance.id, id))
  } else {
    await db.insert(schema.mmoInstance).values(data)
  }

  return cResp({ id, name: data.name, json })
})
