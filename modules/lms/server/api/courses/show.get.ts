import { db, schema } from '@nuxthub/db'
import { eq, and, inArray, isNull, or, not, sql } from 'drizzle-orm'

/**
 * Course detail API (lms enhanced)
 *
 * On top of doc's base course detail, adds:
 * - Teachers list (teachers)
 * - Student count (studentCount)
 * - Chapter accessibility (accessible): admins/teachers can access all; normal users by is_open + class_chapter.open
 * - Chapter completion (isPass): current user's is_pass from user_chapters
 */
export default eventHandler(async (event) => {
  const id = requireQueryId(event)
  if (!id) {
    return cResp(null, 'Invalid course ID', false)
  }

  const course = await db.query.courses.findFirst({
    where: eq(schema.courses.id, id),
    with: { chapters: true },
  })

  if (!course) {
    return cResp(null, 'Course not found', false)
  }

  // Normalize course detail (base structure provided by doc)
  const result = normalizeCourseDetail(course)

  // Query teacher/editor list
  const teachers = await getCourseMembers(id)
  result.teachers = teachers.map(t => ({
    userId: t.userId,
    username: t.username,
    name: t.name,
    avatarImg: t.avatarImg,
    isTeacher: !!t.isTeacher,
    isEditor: !!t.isEditor,
  }))

  // Query student count (active enrollments that are not teacher/editor)
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

  // Compute accessibility of each chapter for the current user (SSR-friendly)
  const user = await getCurrentUser(event)
  const isAdmin = user?.roles?.includes('admin')
  const isTeacher = user ? await isCourseTeacher(user.id, id) : false
  const canEditAll = isAdmin || isTeacher

  if (canEditAll) {
    // Teachers/admins: all chapters are accessible
    result.chapters = result.chapters.map(ch => ({ ...ch, accessible: true }))
  } else {
    // Normal users: is_open=true OR their class has class_chapter.open=true
    const accessibleIds = new Set<number>()

    // 1. Chapters with is_open=true
    for (const ch of course.chapters || []) {
      if (ch.isOpen) accessibleIds.add(ch.id)
    }

    // 2. Chapters open in the user's classes
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

  // Include the current user's completion (is_pass) for each chapter, for the sidebar checkmarks
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
