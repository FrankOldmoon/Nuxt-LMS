import { db, schema } from "@nuxthub/db"
import { eq, and, inArray } from "drizzle-orm"

/**
 * 章节详情 API（lms 覆盖版）
 *
 * 覆盖机制：
 * - 文件名：lms 用 `show.get.ts`（method=GET），doc 也用 `show.get.ts`（method=GET）
 *   → 必须 method 相同，否则 hook 倒序去重会跳过不同 method 的 handler
 * - 实际生效靠 lms/index.ts 的 `nitro:config` hook：
 *   Nitro 的 nitroConfig.handlers 数组是 push 累加的，h3 router 匹配时取第一个命中的 handler。
 *   lms 在 doc 之后 addServerScanDir，所以 lms 的 handler 在数组中排在 doc 之后。
 *   hook 对 lmsOverridePaths 列表中的 path 做"倒序去重"，保留后注册者（lms），让 h3 命中 lms。
 *
 * 不要删除 doc/.../show.get.ts：
 * - lms 未启用时，doc 版本仍需工作（不带 lms 增强，但保持向后兼容）
 * - lms 启用时，doc 版本会被 hook 移除
 *
 * 不要把 lms 文件改名为 `show.ts`（method=ALL）：
 * - ALL 不会被去重（method 字段不同），doc 的 GET 仍然先被命中，覆盖失败
 */
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

  // 访问控制：admin / 课程教师 / 编辑者始终可访问
  const user = await getCurrentUser(event)
  const isAdmin = user?.roles?.includes('admin')
  const isTeacher = user ? await isCourseTeacher(user.id, chapter.courseId) : false

  // 班级 gating（lms 模式必启用，无需 lmsEnabled 守卫）
  if (!isAdmin && !isTeacher && !chapter.isOpen) {
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
      throw createError({ statusCode: 403, message: '该章节尚未开放' })
    }
  }

  // 查询当前用户的章节学习记录（task_status / is_pass）
  // lms 模式下对所有登录用户都查询（非 lms 模式无 userChapters 表，但 lms 启用时表一定存在）
  let userChapter: any = null
  if (user) {
    userChapter = await db.query.userChapters.findFirst({
      where: and(eq(schema.userChapters.userId, user.id), eq(schema.userChapters.chapterId, id)),
    })
  }
  const result = normalizeChapterPageData(chapter, chapter.course, userChapter)

  // 教师/管理员：附带 isOpen 和班级开放状态
  // 仍保留角色限制：非教师用户前端 accessBar 由 canEdit=v-if 隐藏，没必要传输 isOpen
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
