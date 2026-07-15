import { db, schema } from '@nuxthub/db'

/** Add a new medal (admin only) */
export default eventHandler(async (event) => {
  const user = await requireAuth(event)
  if (!user.roles.includes('admin')) {
    return cResp(null, 'No permission: admin only', false)
  }

  const body = await readBody(event)
  const { name, content } = body
  if (!name) return cResp(null, 'Missing name parameter', false)

  const result = await db.insert(schema.medals).values({
    name,
    content: content || {},
  }).returning()

  return cResp(result[0])
})
