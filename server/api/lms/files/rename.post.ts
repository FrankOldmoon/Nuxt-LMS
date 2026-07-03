import { db, schema } from '@nuxthub/db'
import { eq, and, isNull } from 'drizzle-orm'

export default eventHandler(async (event) => {
  const user = await requireAuth(event)

  const body = await readBody(event)
  const id = Number(body.id)
  const name = String(body.name || '').trim()

  if (!id) return cResp(null, 'id 不能为空', false)
  if (!name) return cResp(null, 'name 不能为空', false)

  // 仅允许修改自己上传的、未删除的文件
  const file = await db.query.files.findFirst({
    where: and(eq(schema.files.id, id), eq(schema.files.userId, user.id), isNull(schema.files.deletedAt)),
  })
  if (!file) return cResp(null, '文件不存在或无权限', false)

  await db.update(schema.files)
    .set({ name, updatedAt: new Date() })
    .where(eq(schema.files.id, id))

  return cResp({ id, name }, '重命名成功')
})
