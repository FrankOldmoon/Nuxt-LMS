import { db, schema } from '@nuxthub/db'
import { eq } from 'drizzle-orm'


export default eventHandler(async (event) => {
  // Only admins can update categories
  await requireAdmin(event)

  const body = await readBody(event)
  const { id, ...setData } = body

  if (!id) {
    return cResp(null, 'Missing id parameter', false)
  }

  try {
    // If orders is updated, sync the course name as well
    if (setData.orders !== undefined && Array.isArray(setData.orders)) {
      const courseUpdates = (setData.orders as any[])
        .filter(o => o.id && !o.id.startsWith('custom-') && !isNaN(Number(o.id)))
        .map(o => ({ id: Number(o.id), name: o.label }))

      for (const item of courseUpdates) {
        if (item.name) {
          await db.update(schema.courses)
            .set({ name: item.name, updatedAt: new Date() })
            .where(eq(schema.courses.id, item.id))
        }
      }
    }

    const result = await updateTable('categories', Number(id), setData)
    // Notify all clients: home navigation has been updated (all useHome() consumers auto-refresh)
    broadcastToAll({ type: 'home-changed', reason: 'categories.update' })
    return cResp(result)
  } catch (error: any) {
    console.error('Failed to update category:', error)
    return cResp(null, error.message || 'Update failed', false)
  }
})
