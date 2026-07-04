import { db, schema } from "@nuxthub/db"
import { eq, and, inArray } from "drizzle-orm"

export default eventHandler(async (event) => {
  const id = requireQueryId(event)
  if (!id) {
    return cResp(null, '章节 ID 无效', false)
  }

  const chapter = await db.query.chapters.findFirst({
    where: eq(schema.chapters.id, id),
    with: {
      course: {
        with: { chapters: true },
      },
    },
  })

  if (!chapter) {
    return cResp(null, '章节不存在', false)
  }

  // 访问控制：admin 或课程教师/编辑者始终可访问
  const user = await getCurrentUser(event)
  const isAdmin = user?.roles?.includes('admin')
  const isTeacher = user ? await isCourseTeacher(user.id, chapter.courseId) : false

  if (!isAdmin && !isTeacher) {
    // 检查 chapter.is_open（全局开放）
    if (!chapter.isOpen) {
      // 检查 class_chapter.open（用户所在班级是否开放）
      let classAccessible = false
      if (user) {
        // 查询用户所在的所有班级
        const userClassRows = await db
          .select({ classId: schema.userClasses.classId })
          .from(schema.userClasses)
          .where(eq(schema.userClasses.userId, user.id))
        const userClassIds = userClassRows.map(r => r.classId)

        if (userClassIds.length > 0) {
          // 查询这些班级在本章节的 open 状态
          const classChapters = await db
            .select({ classId: schema.classChapters.classId, open: schema.classChapters.open })
            .from(schema.classChapters)
            .where(and(
              eq(schema.classChapters.chapterId, id),
              inArray(schema.classChapters.classId, userClassIds),
            ))
          // 任一班级 open=true 即可访问
          classAccessible = classChapters.some(cc => cc.open)
        }
      }

      if (!classAccessible) {
        throw createError({ statusCode: 403, statusMessage: '该章节尚未开放' })
      }
    }
  }

  // 返回章节页面数据
  const result = normalizeChapterPageData(chapter, chapter.course)

  // 教师/管理员：附带 isOpen 和班级开放状态，供 accessBar 使用（避免前端再请求）
  if (isAdmin || isTeacher) {
    result.chapter.isOpen = !!chapter.isOpen
    const allClassChapters = await db
      .select({ classId: schema.classChapters.classId, open: schema.classChapters.open })
      .from(schema.classChapters)
      .where(eq(schema.classChapters.chapterId, id))
    result.chapter.classChapters = allClassChapters.map(cc => ({
      classId: cc.classId,
      open: !!cc.open,
    }))
  }

  return cResp(result)
})
