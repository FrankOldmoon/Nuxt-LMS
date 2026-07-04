import { db, schema } from "@nuxthub/db"
import { eq, and, inArray } from "drizzle-orm"

export default eventHandler(async (event) => {
  const id = requireQueryId(event)
  if (!id) {
    return cResp(null, '课程 ID 无效', false)
  }

  const course = await db.query.courses.findFirst({
    where: eq(schema.courses.id, id),
    with: { chapters: true },
  })

  if (!course) {
    return cResp(null, '课程不存在', false)
  }

  // 归一化课程详情
  const result = normalizeCourseDetail(course)

  // 计算每个章节对当前用户的开放状态（SSR 友好）
  const user = await getCurrentUser(event)
  const isAdmin = user?.roles?.includes('admin')
  const isTeacher = user ? await isCourseTeacher(user.id, id) : false
  const canEditAll = isAdmin || isTeacher

  if (canEditAll) {
    // 教师/管理员：所有章节都可访问
    result.chapters = result.chapters.map(ch => ({ ...ch, accessible: true }))
  } else {
    // 普通用户：is_open=true 或其班级 class_chapter.open=true
    const accessibleIds = new Set<number>()

    // 1. is_open=true 的章节
    for (const ch of course.chapters || []) {
      if (ch.isOpen) accessibleIds.add(ch.id)
    }

    // 2. 用户班级 open 的章节
    if (user) {
      const userClassRows = await db
        .select({ classId: schema.userClasses.classId })
        .from(schema.userClasses)
        .where(eq(schema.userClasses.userId, user.id))
      const userClassIds = userClassRows.map(r => r.classId)

      if (userClassIds.length > 0) {
        const allChapterIds = (course.chapters || []).map(c => c.id)
        const classChapters = await db
          .select({ chapterId: schema.classChapters.chapterId })
          .from(schema.classChapters)
          .where(and(
            inArray(schema.classChapters.classId, userClassIds),
            inArray(schema.classChapters.chapterId, allChapterIds),
            eq(schema.classChapters.open, true),
          ))
        for (const cc of classChapters) {
          accessibleIds.add(cc.chapterId)
        }
      }
    }

    result.chapters = result.chapters.map(ch => ({ ...ch, accessible: accessibleIds.has(ch.id) }))
  }

  return cResp(result)
})
