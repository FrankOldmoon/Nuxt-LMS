import { db, schema } from '@nuxthub/db'

/** 新增奖章（仅管理员） */
export default eventHandler(async (event) => {
  const user = await requireAuth(event)
  if (!user.roles.includes('admin')) {
    return cResp(null, '无权限：仅管理员可操作', false)
  }

  const body = await readBody(event)
  const { name, content } = body
  if (!name) return cResp(null, '缺少 name 参数', false)

  const result = await db.insert(schema.medals).values({
    name,
    content: content || {},
  }).returning()

  return cResp(result[0])
})
