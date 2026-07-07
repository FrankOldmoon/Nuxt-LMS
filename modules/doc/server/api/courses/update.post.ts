import { db, schema } from '@nuxthub/db'
import { eq } from 'drizzle-orm'

export default eventHandler(async (event) => {
  const body = await readBody(event)
  const { id, ...setData } = body

  if (!id) {
    return cResp(null, '缺少 id 参数', false)
  }

  await requireCourseTeacher(event, Number(id))

  try {
    // 若更新了 content，先将旧内容保存为版本快照
    if (setData.content !== undefined) {
      const current = await showTable('courses', Number(id))
      const oldContent = (current as any)?.content
      if (oldContent !== undefined && oldContent !== null
        && JSON.stringify(oldContent) !== JSON.stringify(setData.content)) {
        await saveContentVersion('course', Number(id), oldContent)
      }
    }

    // 若更新了 orders，同步更新 chapter 的 name
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
    return cResp(result)
  } catch (error: any) {
    console.error('更新课程失败:', error)
    return cResp(null, error.statusMessage || '更新失败', false)
  }
})
