import { db, schema } from '@nuxthub/db'

/**
 * 批量添加用户到班级
 * body: { classId: number, userIds: number[], isTeacher?: boolean }
 */
export default eventHandler(async (event) => {
  const body = await readBody(event)
  const { classId, userIds, isTeacher } = body

  if (!classId || !Array.isArray(userIds) || !userIds.length) {
    return cResp(null, '缺少参数', false)
  }

  await requireAdmin(event)

  try {
    const rows = userIds.map((userId: number) => ({
      userId,
      classId: Number(classId),
      ...(isTeacher !== undefined ? { isTeacher } : {}),
    }))

    await db
      .insert(schema.userClasses)
      .values(rows)
      .onConflictDoNothing()

    return cResp({ success: true, added: userIds.length })
  } catch (error: any) {
    console.error('添加班级用户失败:', error)
    return cResp(null, error.statusMessage || '添加失败', false)
  }
})
