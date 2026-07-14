import { db, schema } from '@nuxthub/db'
import { eq } from 'drizzle-orm'
import { canManageExistingGood } from '../../utils/goods/perms'

/** 删除商品（admin/教师），级联删除 bags */
export default eventHandler(async (event) => {
  const user = await requireAuth(event)
  const body = await readBody(event)
  const { id } = body

  if (!id) return cResp(null, '缺少 id 参数', false)
  if (!(await canManageExistingGood(user, Number(id)))) {
    return cResp(null, '无权限：仅管理员或课程教师可操作', false)
  }

  await db.delete(schema.goods).where(eq(schema.goods.id, Number(id)))
  return cResp({ success: true })
})
