/**
 * 学习进度：章节可访问性计算
 *
 * 教师/管理员：所有章节都可访问
 * 普通用户：isOpen=true 或用户班级 classChapters.open=true
 */
import { db, schema } from '@nuxthub/db'
import { eq, and, inArray } from 'drizzle-orm'

type ChapterLite = { id: number; isOpen: boolean }

/**
 * 计算指定用户对课程章节的可访问集合
 */
export async function computeChapterAccessibility(
  user: { id: number; roles?: string[] },
  courseId: number,
  chapters: ChapterLite[],
): Promise<Set<number>> {
  const accessible = new Set<number>()
  if (!chapters.length) return accessible

  const isAdmin = user.roles?.includes('admin')
  const isTeacher = !isAdmin && await isCourseTeacher(user.id, courseId)
  if (isAdmin || isTeacher) {
    for (const ch of chapters) accessible.add(ch.id)
    return accessible
  }

  // 1. isOpen=true 的章节
  for (const ch of chapters) {
    if (ch.isOpen) accessible.add(ch.id)
  }

  // 2. 用户班级 open 的章节
  const userClassRows = await db
    .select({ classId: schema.userClasses.classId })
    .from(schema.userClasses)
    .where(eq(schema.userClasses.userId, user.id))
  const userClassIds = userClassRows.map(r => r.classId)
  if (!userClassIds.length) return accessible

  const chapterIds = chapters.map(ch => ch.id)
  const classChapters = await db
    .select({ chapterId: schema.classChapters.chapterId })
    .from(schema.classChapters)
    .where(and(
      inArray(schema.classChapters.classId, userClassIds),
      inArray(schema.classChapters.chapterId, chapterIds),
      eq(schema.classChapters.open, true),
    ))
  for (const cc of classChapters) accessible.add(cc.chapterId)
  return accessible
}
