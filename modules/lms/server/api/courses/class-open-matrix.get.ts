/**
 * 课程「章节 × 班级」开放状态矩阵（管理员/课程教师）
 * GET /api/courses/class-open-matrix?courseId=1
 *
 * 行为章节、列为班级；单元格为该章节对该班是否开放（class_chapters.open）。
 * 班级 = 系统全部班级（与 accessBar 的班级多选一致）；
 * 章节 = 该课程全部章节（含章节级 isOpen，表头一并返回）。
 */
import { db, schema } from '@nuxthub/db'
import { eq, and, inArray, isNull } from 'drizzle-orm'

export default eventHandler(async (event) => {
  const user = await requireAuth(event)
  const courseId = Number(getQuery(event).courseId)
  if (!courseId) return cResp(null, '缺少 courseId', false)

  // 仅管理员或课程教师可查看
  const canView = user.roles.includes('admin') || await isCourseTeacher(user.id, courseId)
  if (!canView) return cResp(null, '无权限', false)

  // 该课程全部章节 + 全部班级 + 相关 class_chapters 开放状态
  const [chapters, allClasses] = await Promise.all([
    db
      .select({ id: schema.chapters.id, name: schema.chapters.name, isOpen: schema.chapters.isOpen })
      .from(schema.chapters)
      .where(and(eq(schema.chapters.courseId, courseId), isNull(schema.chapters.deletedAt))),
    db
      .select({ id: schema.classes.id, name: schema.classes.name })
      .from(schema.classes)
      .where(isNull(schema.classes.deletedAt)),
  ])

  // 章节按 id 升序（保持稳定顺序）
  chapters.sort((a, b) => a.id - b.id)

  // 只取本课程章节的班级开放记录，避免把其他课程的开放班级一并列出
  const chapterIds = chapters.map(c => c.id)
  const classChapters = await db
    .select({
      classId: schema.classChapters.classId,
      chapterId: schema.classChapters.chapterId,
      open: schema.classChapters.open,
    })
    .from(schema.classChapters)
    .where(inArray(schema.classChapters.chapterId, chapterIds))

  // 只列出「开放班级」：在 class_chapters 中至少有一个章节标记为开放的班级
  const openClassIds = new Set(allClasses
    .filter(c => classChapters.some(cc => cc.classId === c.id && cc.open))
    .map(c => c.id))

  // chapterId -> { classId -> open }（仅保留开放班级）
  const openMap: Record<number, Record<number, boolean>> = {}
  for (const cc of classChapters) {
    if (!openClassIds.has(cc.classId)) continue
    if (!openMap[cc.chapterId]) openMap[cc.chapterId] = {}
    openMap[cc.chapterId][cc.classId] = !!cc.open
  }

  return cResp({
    chapters: chapters.map(c => ({ id: c.id, name: c.name, isOpen: !!c.isOpen })),
    classes: allClasses
      .filter(c => openClassIds.has(c.id))
      .map(c => ({ id: c.id, name: c.name })),
    openMap,
  })
})