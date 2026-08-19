import { db, schema } from '@nuxthub/db'
import { eq, and, isNull } from 'drizzle-orm'
import { canAccessGroupFile } from '../../utils/files/access'

export default eventHandler(async (event) => {
  const user = await requireAuth(event)

  const body = await readBody(event)
  const id = Number(body.id)
  const name = String(body.name || '').trim()

  if (!id) return cResp(null, 'id 不能为空', false)
  if (!name) return cResp(null, 'name 不能为空', false)

  // 查找文件（未删除）：小组文件限所有者/组内成员/教师；个人文件仅所有者可改
  const file = await db.query.files.findFirst({
    where: and(eq(schema.files.id, id), isNull(schema.files.deletedAt)),
  })
  if (!file) return cResp(null, '文件不存在或无权限', false)
  if (file.group) {
    if (!(await canAccessGroupFile(user, file))) {
      return cResp(null, '文件不存在或无权限', false)
    }
  } else if (file.userId !== user.id) {
    return cResp(null, '文件不存在或无权限', false)
  }

  await db.update(schema.files)
    .set({ name, updatedAt: new Date() })
    .where(eq(schema.files.id, id))

  return cResp({ id, name }, '重命名成功')
})
