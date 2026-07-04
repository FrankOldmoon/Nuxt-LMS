/**
 * 章节班级开放控制
 * GET  /api/lms/chapters/classes?chapterId=1  → 获取该章节的班级开放状态列表
 * POST /api/lms/chapters/classes              → 见 classes.post.ts
 *
 * 仅教师/管理员可操作
 */
import { db, schema } from '@nuxthub/db'
import { eq } from 'drizzle-orm'

export default eventHandler(async (event) => {
  const user = await requireAuth(event)

  const chapterId = Number(getQuery(event).chapterId)
  if (!chapterId) return cResp(null, '缺少 chapterId', false)

  // 查询章节所属课程以校验权限
  const chapter = await db
    .select({ courseId: schema.chapters.courseId })
    .from(schema.chapters)
    .where(eq(schema.chapters.id, chapterId))
    .limit(1)
  if (!chapter[0]) return cResp(null, '章节不存在', false)

  const canEdit = user.roles.includes('admin') || await isCourseTeacher(user.id, chapter[0].courseId)
  if (!canEdit) return cResp(null, '无权限', false)

  // 获取所有班级 + 该章节的 class_chapter 开放状态
  const allClasses = await db.select().from(schema.classes)
  const classChapters = await db
    .select()
    .from(schema.classChapters)
    .where(eq(schema.classChapters.chapterId, chapterId))

  const openMap = new Map(classChapters.map(cc => [cc.classId, cc.open]))
  const result = allClasses.map(c => ({
    classId: c.id,
    name: c.name,
    open: openMap.get(c.id) ?? false,
  }))

  return cResp(result)
})
