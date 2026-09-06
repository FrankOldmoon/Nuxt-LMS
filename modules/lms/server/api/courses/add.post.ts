import { normalizeContent } from '../../utils/content'

export default eventHandler(async (event) => {
  // 仅管理员可新增课程
  await requireAdmin(event)

  const body = await readBody(event)
  // content 支持直接传 markdown 字符串（自动转 tiptap doc）
  if (body.content !== undefined) {
    body.content = normalizeContent(body.content)
  }
  try {
    const result = await addTable('courses', body)
    // 通知所有客户端：首页导航已更新
    broadcastToAll({ type: 'home-changed', reason: 'courses.add' })
    return cResp(result)
  } catch (error: any) {
    console.error('新增课程失败:', error)
    return cResp(null, error.message || '新增失败', false)
  }
})
