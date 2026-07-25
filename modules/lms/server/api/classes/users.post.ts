import { db, schema } from '@nuxthub/db'

/**
 * 批量添加用户到班级
 * body: { classId: number, userIds: number[], isTeacher?: boolean }
 *
 * 副作用：
 * - 当 isTeacher=true 时，自动给所有被添加的用户分配 'teacher' 角色
 *   （班级 isTeacher 标志配合系统级 teacher 角色共同生效；详见 useAuth.isCourseTeacher）
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

    // 班级内设为教师时，同步给每个用户加上 teacher 角色（幂等，失败仅 warn）
    if (isTeacher === true) {
      await Promise.all(
        userIds.map((userId: number) => assignRoleToUser(Number(userId), 'teacher')),
      )
    }

    return cResp({ success: true, added: userIds.length })
  } catch (error: any) {
    console.error('添加班级用户失败:', error)
    return cResp(null, error.message || '添加失败', false)
  }
})
