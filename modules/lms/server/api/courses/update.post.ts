import { db, schema } from '@nuxthub/db'
import { eq } from 'drizzle-orm'


export default eventHandler(async (event) => {
  const body = await readBody(event)
  const { id, ...setData } = body

  if (!id) {
    return cResp(null, 'Missing id parameter', false)
  }

  await requireCourseTeacher(event, Number(id))

  try {
    // If content was updated, first save the old content as a version snapshot
    if (setData.content !== undefined) {
      const current = await showTable('courses', Number(id))
      const oldContent = (current as any)?.content
      if (oldContent !== undefined && oldContent !== null
        && JSON.stringify(oldContent) !== JSON.stringify(setData.content)) {
        await saveContentVersion('course', Number(id), oldContent)
      }
    }

    // If orders was updated, sync chapter name
    if (setData.orders !== undefined && Array.isArray(setData.orders)) {
      const chapterUpdates = (setData.orders as any[])
        .filter(o => o.id && !o.id.startsWith('custom-') && o.id !== 'course' && !isNaN(Number(o.id)))
        .map(o => ({ id: Number(o.id), name: o.label }))

      for (const item of chapterUpdates) {
        if (item.name) {
          await db.update(schema.chapters)
            .set({ name: item.name, updatedAt: new Date() })
            .where(eq(schema.chapters.id, item.id))
        }
      }
    }

    const result = await updateTable('courses', Number(id), setData)
    // Course info (title/category/status etc.) changes affect the home navigation
    broadcastToAll({ type: 'home-changed', reason: 'courses.update' })
    return cResp(result)
  } catch (error: any) {
    console.error('Failed to update course:', error)
    return cResp(null, error.message || 'Update failed', false)
  }
})
