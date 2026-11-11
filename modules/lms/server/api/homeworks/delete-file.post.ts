import { db, schema } from '@nuxthub/db'
import { and, eq } from 'drizzle-orm'

export default eventHandler(async (event) => {
  const user = await requireRole(event, ['teacher', 'admin'])
  const body = await readBody(event)
  const { course_id, homework_cid, user_id, file_index, file_url } = body || {}
  const courseId = Number(course_id)
  const homeworkCid = Number(homework_cid)
  const userId = Number(user_id)
  const fileIndex = Number(file_index)

  if (![courseId, homeworkCid, userId, fileIndex].every(Number.isInteger)
    || courseId <= 0 || homeworkCid <= 0 || userId <= 0 || fileIndex < 0
    || typeof file_url !== 'string' || !file_url) {
    return cResp(null, '参数无效', false)
  }

  if (!user.roles.includes('admin') && !await isCourseStaff(user.id, courseId)) {
    throw createError({ statusCode: 403, message: '无权限：仅该课程教师或管理员可删除附件' })
  }

  const homework = await db.query.homeworks.findFirst({
    where: and(
      eq(schema.homeworks.courseId, courseId),
      eq(schema.homeworks.cid, homeworkCid),
    ),
  })
  if (!homework) return cResp(null, '未找到作业', false)

  const existing = await db.query.userHomeworks.findFirst({
    where: and(
      eq(schema.userHomeworks.userId, userId),
      eq(schema.userHomeworks.courseId, courseId),
      eq(schema.userHomeworks.homeworkCid, homeworkCid),
    ),
  })
  if (!existing || !Array.isArray(existing.files)) {
    return cResp(null, '未找到作业提交附件', false)
  }

  const target = existing.files[fileIndex]
  const targetUrl = typeof target === 'string' ? target : target?.url
  if (targetUrl !== file_url) {
    return cResp(null, '附件已变化，请刷新后重试', false)
  }

  const files = existing.files.filter((_, index) => index !== fileIndex)
  const updated = await db.update(schema.userHomeworks).set({ files }).where(and(
    eq(schema.userHomeworks.userId, userId),
    eq(schema.userHomeworks.courseId, courseId),
    eq(schema.userHomeworks.homeworkCid, homeworkCid),
    eq(schema.userHomeworks.files, existing.files),
  )).returning()

  if (!updated.length) return cResp(null, '更新附件失败', false)
  return cResp({ files: updated[0].files })
})
