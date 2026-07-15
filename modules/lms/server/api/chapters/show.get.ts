import { db, schema } from "@nuxthub/db"
import { eq, and, inArray } from "drizzle-orm"

/**
 * Chapter detail API (lms override)
 *
 * Override mechanism:
 * - File names: lms uses `show.get.ts` (method=GET), doc also uses `show.get.ts` (method=GET)
 *   -> Methods must match, otherwise the reverse-order dedup hook will skip handlers with different methods
 * - The actual override relies on the `nitro:config` hook in lms/index.ts:
 *   Nitro's nitroConfig.handlers array is appended to (push), and the h3 router matches the first hit.
 *   lms calls addServerScanDir after doc, so lms's handlers end up after doc's in the array.
 *   The hook reverse-dedupes paths in lmsOverridePaths, keeping the later-registered (lms) so h3 hits lms.
 *
 * Do not delete doc/.../show.get.ts:
 * - When lms is not enabled, the doc version must still work (without lms enhancements, but backwards compatible)
 * - When lms is enabled, the doc version will be removed by the hook
 *
 * Do not rename the lms file to `show.ts` (method=ALL):
 * - ALL is not deduped (different method field), so doc's GET would still match first and the override would fail
 */
export default eventHandler(async (event) => {
  const id = requireQueryId(event)
  if (!id) {
    return cResp(null, 'Invalid chapter ID', false)
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
    return cResp(null, 'Chapter not found', false)
  }

  // Access control: admin / course teacher / editor can always access
  const user = await getCurrentUser(event)
  const isAdmin = user?.roles?.includes('admin')
  const isTeacher = user ? await isCourseTeacher(user.id, chapter.courseId) : false

  // Class gating (always enabled in lms mode, no lmsEnabled guard needed)
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
      throw createError({ statusCode: 403, message: 'This chapter is not yet open' })
    }
  }

  // Look up the current user's chapter study record (task_status / is_pass)
  // In lms mode, query for all logged-in users (no userChapters table in non-lms mode, but the table is guaranteed to exist when lms is enabled)
  let userChapter: any = null
  if (user) {
    userChapter = await db.query.userChapters.findFirst({
      where: and(eq(schema.userChapters.userId, user.id), eq(schema.userChapters.chapterId, id)),
    })
  }
  const result = normalizeChapterPageData(chapter, chapter.course, userChapter)

  // For teachers/admins: also include isOpen and class-open status
  // Keep the role restriction: non-teacher users' frontend accessBar is hidden by canEdit=v-if, so no need to transmit isOpen
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
