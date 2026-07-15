import { db, schema } from '@nuxthub/db'
import { eq } from 'drizzle-orm'
import { canManageExistingGood } from '../../utils/goods/perms'

/** Delete good (admin/teacher), cascade delete bags */
export default eventHandler(async (event) => {
  const user = await requireAuth(event)
  const body = await readBody(event)
  const { id } = body

  if (!id) return cResp(null, 'Missing id parameter', false)
  if (!(await canManageExistingGood(user, Number(id)))) {
    return cResp(null, 'No permission: only admin or course teacher can perform this action', false)
  }

  await db.delete(schema.goods).where(eq(schema.goods.id, Number(id)))
  return cResp({ success: true })
})
