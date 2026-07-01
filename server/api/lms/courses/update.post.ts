export default eventHandler(async (event) => {
  const body = await readBody(event)
  const { id, ...setData } = body

  if (!id) {
    return cResp(null, '缺少 id 参数', false)
  }

  // 管理员或该课程的任课教师可更新
  await requireCourseTeacher(event, Number(id))

  try {
    // 若更新了 content，先将旧内容保存为版本快照（仅保留最新 10 条）
    if (setData.content !== undefined) {
      const current = await showTable('courses', Number(id))
      const oldContent = (current as any)?.content
      if (oldContent !== undefined && oldContent !== null
        && JSON.stringify(oldContent) !== JSON.stringify(setData.content)) {
        await saveContentVersion('course', Number(id), oldContent)
      }
    }
    const result = await updateTable('courses', Number(id), setData)
    return cResp(result)
  } catch (error: any) {
    console.error('更新课程失败:', error)
    return cResp(null, error.statusMessage || '更新失败', false)
  }
})
