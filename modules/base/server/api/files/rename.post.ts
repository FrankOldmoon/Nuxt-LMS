import { db, schema } from '@nuxthub/db'
import { eq, and, isNull } from 'drizzle-orm'

export default eventHandler(async (event) => {
  const user = await requireAuth(event)

  const body = await readBody(event)
  const id = Number(body.id)
  const name = String(body.name || '').trim()

  if (!id) return cResp(null, 'id cannot be empty', false)
  if (!name) return cResp(null, 'name cannot be empty', false)

  // Find file (not deleted): group files can be renamed by any member; personal files only by owner
  const file = await db.query.files.findFirst({
    where: and(eq(schema.files.id, id), isNull(schema.files.deletedAt)),
  })
  if (!file) return cResp(null, 'File does not exist or no permission', false)
  if (!file.group && file.userId !== user.id) {
    return cResp(null, 'File does not exist or no permission', false)
  }

  await db.update(schema.files)
    .set({ name, updatedAt: new Date() })
    .where(eq(schema.files.id, id))

  return cResp({ id, name }, 'Renamed successfully')
})
