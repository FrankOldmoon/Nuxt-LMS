import { db, schema } from '@nuxthub/db'
import { eq, and, inArray, isNull, or, not, sql } from 'drizzle-orm'

/**
 * 课程详情 API（lms 增强版）
 *
 * 在 doc 的基础课程详情上增加：
 * - 教师列表（teachers）
 * - 学生人数（studentCount）
 * - 章节可访问性（accessible）：管理员/教师全部可访问；普通用户按 is_open + class_chapter.open
 * - 章节完成状态（isPass）：当前用户在 user_chapters 表中的 is_pass
 */
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

  // 归一化课程详情（doc 提供的基础结构）
  const result = normalizeCourseDetail(course)

  // 查询教师/编辑者列表
  const teachers = await getCourseMembers(id)
  result.teachers = teachers.map(t => ({
    userId: t.userId,
    username: t.username,
    name: t.name,
    avatarImg: t.avatarImg,
    isTeacher: !!t.isTeacher,
    isEditor: !!t.isEditor,
  }))

  // 查询学生人数（非教师/编辑者的有效选课记录）
  const studentRows = await db
    .select({ count: sql<number>`count(*)` })
    .from(schema.userCourses)
    .where(
      and(
        eq(schema.userCourses.courseId, id),
        isNull(schema.userCourses.deletedAt),
        not(or(
          eq(schema.userCourses.isTeacher, true),
          eq(schema.userCourses.isEditor, true),
        )!),
      ),
    )
  result.studentCount = Number(studentRows[0]?.count ?? 0)

  // 计算每个章节对当前用户的开放状态（SSR 友好）
  const user = await getCurrentUser(event)
  const isAdmin = user?.roles?.includes('admin')
  const isTeacher = user ? await isCourseTeacher(user.id, id) : false
  // observer 为只读观察者：所有章节可见（但不参与编辑权限判断）
  const isObserver = user?.roles?.includes('observer')
  const canViewAll = isAdmin || isTeacher || isObserver

  if (canViewAll) {
    // 教师/管理员/观察者：所有章节都可访问
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

  // 附带当前用户每个章节的完成状态（is_pass），供侧边栏打钩
  if (user) {
    const allChapterIds = (course.chapters || []).map(c => c.id)
    if (allChapterIds.length > 0) {
      const userChapters = await db
        .select({ chapterId: schema.userChapters.chapterId, isPass: schema.userChapters.isPass })
        .from(schema.userChapters)
        .where(and(
          eq(schema.userChapters.userId, user.id),
          inArray(schema.userChapters.chapterId, allChapterIds),
        ))
      const passMap = new Map(userChapters.map(uc => [uc.chapterId, !!uc.isPass]))
      result.chapters = result.chapters.map(ch => ({ ...ch, isPass: passMap.get(ch.id) ?? false }))
    }
  }

  return cResp(result)
})
