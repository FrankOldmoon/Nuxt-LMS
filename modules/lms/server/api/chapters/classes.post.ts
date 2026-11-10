/**
 * 章节班级开放控制
 * POST /api/chapters/classes
 *   body: { chapterId, classes: [{ classId, open }] }
 *   批量 upsert class_chapters.open
 *
 * 仅教师/管理员可操作
 */
import { db, schema } from '@nuxthub/db'
import { eq, and } from 'drizzle-orm'

export default eventHandler(async (event) => {
  const user = await requireAuth(event)

  const body = await readBody(event)
  const { chapterId, classes } = body
  if (!chapterId || !Array.isArray(classes)) {
    return cResp(null, '缺少 chapterId 或 classes 参数', false)
  }

  // 权限校验：observer 只读，即使挂了 teacher 角色也不放行
  const chapter = await db
    .select({ courseId: schema.chapters.courseId })
    .from(schema.chapters)
    .where(eq(schema.chapters.id, Number(chapterId)))
    .limit(1)
  if (!chapter[0]) return cResp(null, '章节不存在', false)

  const isObserver = user.roles.includes('observer')
  const canEdit = !isObserver && (
    user.roles.includes('admin') || await isCourseStaff(user.id, chapter[0].courseId)
  )
  if (!canEdit) return cResp(null, '无权限', false)

  // 逐个 upsert
  for (const item of classes) {
    const existing = await db
      .select()
      .from(schema.classChapters)
      .where(and(
        eq(schema.classChapters.classId, Number(item.classId)),
        eq(schema.classChapters.chapterId, Number(chapterId)),
      ))
      .limit(1)

    if (existing[0]) {
      await db.update(schema.classChapters)
        .set({ open: !!item.open })
        .where(and(
          eq(schema.classChapters.classId, Number(item.classId)),
          eq(schema.classChapters.chapterId, Number(chapterId)),
        ))
    } else {
      await db.insert(schema.classChapters).values({
        classId: Number(item.classId),
        chapterId: Number(chapterId),
        open: !!item.open,
      })
    }
  }

  // 班级开放状态变更后，通过 WS 通知相关班级的学生刷新访问权限
  const courseId = chapter[0].courseId
  const msg = JSON.stringify({
    type: 'chapterAccessUpdate',
    courseId,
    chapterId: Number(chapterId),
  })
  for (const item of classes) {
    broadcastToClass(Number(item.classId), msg)
  }

  return cResp({ success: true })
})
