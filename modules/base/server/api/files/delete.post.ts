import { db, schema } from '@nuxthub/db'
import { eq, and, isNull } from 'drizzle-orm'
import { canAccessGroupFile } from '../../utils/files/access'

export default eventHandler(async (event) => {
  const user = await requireAuth(event)

  const body = await readBody(event)
  const id = Number(body.id)
  if (!id) return cResp(null, 'id 不能为空', false)

  // 查找文件（未删除）：小组文件限所有者/组内成员/教师；个人文件仅所有者可删
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

  // 软删除：仅标记 deletedAt，保留物理文件以便恢复
  await db.update(schema.files)
    .set({ deletedAt: new Date() })
    .where(eq(schema.files.id, id))

  return cResp({ id }, '删除成功')
})
