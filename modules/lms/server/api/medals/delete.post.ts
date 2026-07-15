import { db, schema } from '@nuxthub/db'
import { eq } from 'drizzle-orm'

/** Delete a medal (admin only), and cascade delete userMedals */
export default eventHandler(async (event) => {
  const user = await requireAuth(event)
  if (!user.roles.includes('admin')) {
    return cResp(null, 'No permission: admin only', false)
  }

  const body = await readBody(event)
  const { id } = body
  if (!id) return cResp(null, 'Missing id parameter', false)

  await db.delete(schema.medals).where(eq(schema.medals.id, Number(id)))
  return cResp({ success: true })
})
