import { db, schema } from '@nuxthub/db'
import { eq, and, isNull } from 'drizzle-orm'
import { resolve, join } from 'node:path'
import { rm } from 'node:fs/promises'

const UPLOAD_ROOT = resolve('./storage')

export default eventHandler(async (event) => {
  const user = await requireAuth(event)

  const body = await readBody(event)
  const id = Number(body.id)
  if (!id) return cResp(null, 'id 不能为空', false)

  // 仅允许删除自己上传的、未删除的文件
  const file = await db.query.files.findFirst({
    where: and(eq(schema.files.id, id), eq(schema.files.userId, user.id), isNull(schema.files.deletedAt)),
  })
  if (!file) return cResp(null, '文件不存在或无权限', false)

  // 软删除数据库记录
  await db.update(schema.files)
    .set({ deletedAt: new Date() })
    .where(eq(schema.files.id, id))

  // 删除物理文件（安全校验路径在 UPLOAD_ROOT 内）
  const absolutePath = resolve(UPLOAD_ROOT, file.path.replace(/^\/+/, ''))
  if (absolutePath.startsWith(UPLOAD_ROOT + '/')) {
    await rm(absolutePath, { force: true }).catch(() => {})
  }

  return cResp({ id }, '删除成功')
})
