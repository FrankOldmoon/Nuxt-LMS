import { db, schema } from '@nuxthub/db'
import { and, eq, isNull } from 'drizzle-orm'

/**
 * 移除某教师在指定班级的任课关系
 * POST /api/classes/remove-teacher
 * body: { classId: number, userId: number }
 *
 * 软删除 user_classes 中对应的 (classId, userId) 记录，
 * 班级用户查询（getClassUsers）会过滤 deletedAt，因此移除后立即生效。
 */
export default eventHandler(async (event) => {
  await requireAdmin(event)

  const body = await readBody(event)
  const { classId, userId } = body

  if (!classId || !userId) {
    return cResp(null, '缺少参数', false)
  }

  try {
    await db.update(schema.userClasses)
      .set({ deletedAt: new Date() })
      .where(and(
        eq(schema.userClasses.classId, Number(classId)),
        eq(schema.userClasses.userId, Number(userId)),
        isNull(schema.userClasses.deletedAt),
      ))
    return cResp({ success: true }, '已移除')
  } catch (error: any) {
    console.error('移除教师失败:', error)
    return cResp(null, error.message || '移除失败', false)
  }
})
