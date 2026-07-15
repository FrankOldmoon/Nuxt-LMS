/**
 * Update chapter: onUpdate, automatically extract IDs of question/homework/comment from content and store them on the chapter
 * POST /api/chapters/update
 * body: { id, content?, ...other fields }
 */
// Vue node types to extract and the corresponding chapter fields

// Vue node types to extract and the corresponding chapter fields
const ID_EXTRACT_MAP = {
  question: 'questionIds',
  homework: 'homeworkIds',
  comment: 'commentIds',
  quiz: 'quizIds',
} as const

/** Recursively traverse Tiptap JSON content and extract IDs of specified vue node types */
function extractIds(content: any): Record<string, number[]> {
  const result: Record<string, number[]> = {
    questionIds: [],
    homeworkIds: [],
    commentIds: [],
    quizIds: [],
  }

  function traverse(node: any) {
    if (!node || typeof node !== 'object') return
    // Match vue type nodes
    if (node.type === 'vue' && node.attrs?.type && node.attrs?.content) {
      const fieldName = ID_EXTRACT_MAP[node.attrs.type as keyof typeof ID_EXTRACT_MAP]
      if (fieldName && result[fieldName]) {
        const numId = Number(node.attrs.content)
        if (!isNaN(numId)) result[fieldName].push(numId)
      }
    }
    // Recurse into child nodes (Tiptap content may be an array or a single object)
    if (Array.isArray(node.content)) {
      for (const child of node.content) traverse(child)
    } else if (node.content && typeof node.content === 'object') {
      traverse(node.content)
    }
  }

  // The content root may be an array or a single node
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
    return cResp(null, 'Missing id parameter', false)
  }

  await requireChapterTeacher(event, Number(id))

  // Query the current chapter data (used for content version snapshot + courseId for WS sync notification)
  const current = await showTable('chapters', Number(id))
  const courseId = (current as any)?.courseId

  try {
    // If content was updated, first save the old content as a version snapshot, then extract IDs
    let finalData = { ...setData }
    if (setData.content !== undefined) {
      const oldContent = (current as any)?.content
      if (oldContent !== undefined && oldContent !== null
        && JSON.stringify(oldContent) !== JSON.stringify(setData.content)) {
        await saveContentVersion('chapter', Number(id), oldContent)
      }
      // Extract question/homework/comment IDs from the new content
      const ids = extractIds(setData.content)
      finalData = { ...finalData, ...ids }
    }

    const result = await updateTable('chapters', Number(id), finalData)

    // When chapter open state (isOpen) changes, notify students via WS to refresh access
    if (setData.isOpen !== undefined && courseId) {
      const msg = JSON.stringify({
        type: 'chapterAccessUpdate',
        courseId,
        chapterId: Number(id),
      })
      // Broadcast to all active class rooms; clients filter by courseId and refresh
      for (const [classId] of classRooms) {
        broadcastToClass(classId, msg)
      }
    }

    return cResp(result)
  } catch (error: any) {
    console.error('Failed to update chapter:', error)
    return cResp(null, error.message || 'Update failed', false)
  }
})
