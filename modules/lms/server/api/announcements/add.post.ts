/**
 * 创建公告
 * POST /api/announcements/add
 * body: { courseId, name, content?, classIds?: number[] }
 *
 * 权限：课程教师 / 管理员
 *
 * 行为：
 * - classIds 留空 / 空数组  → 创建 1 条 classId = null（面向全员）
 * - classIds 有 N 个        → 创建 N 条，每条对应一个班级
 */
import { db, schema } from '@nuxthub/db'
import { inArray } from 'drizzle-orm'

export default eventHandler(async (event) => {
  const user = await requireAuth(event)
  const body = await readBody(event)
  const courseId = Number(body?.courseId)
  const name = String(body?.name || '').trim()
  const content = body?.content ?? null
  const classIds: number[] = Array.isArray(body?.classIds)
    ? body.classIds.map((n: any) => Number(n)).filter((n: number) => Number.isFinite(n) && n > 0)
    : []

  if (!courseId) return cResp(null, '缺少 courseId', false)
  if (!name) return cResp(null, '缺少 name', false)

  // 权限：管理员 / 系统教师 / 本课程教师（含编辑者）
  const allowed = user.roles.includes('admin')
    || user.roles.includes('teacher')
    || (await isCourseTeacher(user.id, courseId))
  if (!allowed) {
    return cResp(null, '仅教师及以上可创建公告', false)
  }

  // 拉取班级名（用于返回时直接展示）
  let classNames: Array<{ id: number; name: string }> = []
  if (classIds.length) {
    const rows = await db
      .select({ id: schema.classes.id, name: schema.classes.name })
      .from(schema.classes)
      .where(inArray(schema.classes.id, classIds))
    classNames = rows
  }

  // 准备插入值
  const insertValues = classIds.length
    ? classIds.map((cid) => ({
        courseId,
        name,
        content,
        classId: cid,
      }))
    : [{ courseId, name, content, classId: null }]

  const created = await db
    .insert(schema.announcements)
    .values(insertValues)
    .returning()

  return cResp({
    created: created.length,
    records: created,
    classNames,
    allClasses: classIds.length === 0,
  })
})
