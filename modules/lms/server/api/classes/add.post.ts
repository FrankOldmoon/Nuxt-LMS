import { db, schema } from '@nuxthub/db'

export default eventHandler(async (event) => {
  // 仅教师/管理员可新增
  const user = await requireRole(event, ['teacher', 'admin'])

  const table = 'classes'
  const body = await readBody(event)

  try {
    const rows = await addTable(table, body)
    // 非管理员创建者自动绑定为该班级教师（isTeacher），否则创建后无法管理自己的班级
    const newClassId = (rows as any[])[0]?.id
    if (newClassId && !user.roles.includes('admin')) {
      await db.insert(schema.userClasses)
        .values({ userId: user.id, classId: newClassId, isTeacher: true })
        .onConflictDoNothing()
    }
    return cResp(rows)
  } catch (error: any) {
    console.error('插入失败:', error)
    return cResp(null, error.message || '插入失败', false)
  }
})
