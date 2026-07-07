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

  // doc 模式（lms 未启用）：所有章节可查看，跳过班级 gating
  const lmsEnabled = process.env.NUXT_MODULE_LMS === 'true'

  if (!isAdmin && !isTeacher && lmsEnabled && !chapter.isOpen) {
    // 班级访问控制（仅 lms 模式）
    let classAccessible = false
    if (user) {
      const userClassRows = await db
        .select({ classId: schema.userClasses.classId })
        .from(schema.userClasses)
        .where(eq(schema.userClasses.userId, user.id))
      const userClassIds = userClassRows.map(r => r.classId)

      if (userClassIds.length > 0) {
        const classChapters = await db
          .select({ classId: schema.classChapters.classId, open: schema.classChapters.open })
          .from(schema.classChapters)
          .where(and(
            eq(schema.classChapters.chapterId, id),
            inArray(schema.classChapters.classId, userClassIds),
          ))
        classAccessible = classChapters.some(cc => cc.open)
      }
    }

    if (!classAccessible) {
      throw createError({ statusCode: 403, statusMessage: '该章节尚未开放' })
    }
  }

  // 查询当前用户的章节学习记录（task_status / is_pass）
  let userChapter: any = null
  if (user && lmsEnabled) {
    userChapter = await db.query.userChapters.findFirst({
      where: and(eq(schema.userChapters.userId, user.id), eq(schema.userChapters.chapterId, id)),
    })
  }
  const result = normalizeChapterPageData(chapter, chapter.course, userChapter)

  // 教师/管理员：附带 isOpen 和班级开放状态（仅 lms 模式）
  if ((isAdmin || isTeacher) && lmsEnabled) {
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
