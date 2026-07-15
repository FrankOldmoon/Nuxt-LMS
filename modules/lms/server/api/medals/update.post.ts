import { db, schema } from '@nuxthub/db'
import { eq } from 'drizzle-orm'

/** Update a medal (admin only) */
export default eventHandler(async (event) => {
  const user = await requireAuth(event)
  if (!user.roles.includes('admin')) {
    return cResp(null, 'No permission: admin only', false)
  }

  const body = await readBody(event)
  const { id, name, content } = body
  if (!id) return cResp(null, 'Missing id parameter', false)

  const updateData: any = {}
  if (name !== undefined) updateData.name = name
  if (content !== undefined) updateData.content = content

  const result = await db.update(schema.medals)
    .set(updateData)
    .where(eq(schema.medals.id, Number(id)))
    .returning()

  return cResp(result[0])
})
