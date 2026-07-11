import { db, schema } from '@nuxthub/db'
import { eq } from 'drizzle-orm'


export default eventHandler(async (event) => {
  // 仅管理员可更新分类
  await requireAdmin(event)

  const body = await readBody(event)
  const { id, ...setData } = body

  if (!id) {
    return cResp(null, '缺少 id 参数', false)
  }

  try {
    // 若更新了 orders，同步更新 course 的 name
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
    // 通知所有客户端：首页导航已更新（所有 useHome() 消费者自动 refresh）
    broadcastToAll({ type: 'home-changed', reason: 'categories.update' })
    return cResp(result)
  } catch (error: any) {
    console.error('更新分类失败:', error)
    return cResp(null, error.message || '更新失败', false)
  }
})
