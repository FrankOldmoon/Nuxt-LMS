import { normalizeContent } from '../../utils/content'

/**
 * 更新章节：更新时自动从 content 中提取 question/homework/comment 的 ID 存入 chapter
 * POST /api/chapters/update
 * body: { id, content?, ...其他字段 }
 * content 支持直接传 markdown 字符串（自动转 tiptap doc）
 */
// 需要提取的 vue 类型及其对应的 chapter 字段

// 需要提取的 vue 类型及其对应的 chapter 字段
const ID_EXTRACT_MAP = {
  question: 'questionIds',
  homework: 'homeworkIds',
  comment: 'commentIds',
  quiz: 'quizIds',
} as const

/** 递归遍历 Tiptap JSON content，提取指定类型 vue 节点的 ID */
function extractIds(content: any): Record<string, number[]> {
  const result: Record<string, number[]> = {
    questionIds: [],
    homeworkIds: [],
    commentIds: [],
    quizIds: [],
  }

  function traverse(node: any) {
    if (!node || typeof node !== 'object') return
    // 匹配 vue 类型节点
    if (node.type === 'vue' && node.attrs?.type && node.attrs?.content) {
      const fieldName = ID_EXTRACT_MAP[node.attrs.type as keyof typeof ID_EXTRACT_MAP]
      if (fieldName && result[fieldName]) {
        const numId = Number(node.attrs.content)
        if (!isNaN(numId)) result[fieldName].push(numId)
      }
    }
    // 递归子节点（Tiptap content 是数组或单个对象）
    if (Array.isArray(node.content)) {
      for (const child of node.content) traverse(child)
    } else if (node.content && typeof node.content === 'object') {
      traverse(node.content)
    }
  }

  // content 根节点可能是数组或单个节点
  if (Array.isArray(content)) {
    for (const node of content) traverse(node)
  } else if (content) {
    traverse(content)
  }

  return result
}

export default eventHandler(async (event) => {
  const body = await readBody(event)
  const { id, ...setData } = body

  if (!id) {
    return cResp(null, '缺少 id 参数', false)
  }

  await requireChapterTeacher(event, Number(id))

  // content 支持直接传 markdown 字符串（自动转 tiptap doc）
  if (setData.content !== undefined) {
    setData.content = normalizeContent(setData.content)
  }

  // 查询章节当前数据（用于内容版本快照 + courseId 用于 WS 同步通知）
  const current = await showTable('chapters', Number(id))
  const courseId = (current as any)?.courseId

  try {
    // 若更新了 content，先将旧内容保存为版本快照，并提取 ID
    let finalData = { ...setData }
    if (setData.content !== undefined) {
      const oldContent = (current as any)?.content
      if (oldContent !== undefined && oldContent !== null
        && JSON.stringify(oldContent) !== JSON.stringify(setData.content)) {
        await saveContentVersion('chapter', Number(id), oldContent)
      }
      // 从新 content 中提取 question/homework/comment 的 ID
      const ids = extractIds(setData.content)
      finalData = { ...finalData, ...ids }
    }

    const result = await updateTable('chapters', Number(id), finalData)

    // 章节开放状态（isOpen）变更时，通过 WS 通知学生刷新访问权限
    if (setData.isOpen !== undefined && courseId) {
      const msg = JSON.stringify({
        type: 'chapterAccessUpdate',
        courseId,
        chapterId: Number(id),
      })
      // 广播到所有活跃班级房间，客户端按 courseId 过滤后刷新
      for (const [classId] of classRooms) {
        broadcastToClass(classId, msg)
      }
    }

    return cResp(result)
  } catch (error: any) {
    console.error('更新章节失败:', error)
    return cResp(null, error.message || '更新失败', false)
  }
})
