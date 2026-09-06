/**
 * 新增章节：根据课程 lmsConfig.course.defaultChapterOpen 设置章节初始 isOpen
 * POST /api/chapters/add
 * body: { name, courseId, isOpen?, ... }
 */
import { db, schema } from '@nuxthub/db'
import { eq } from 'drizzle-orm'
import { normalizeContent } from '../../utils/content'

export default eventHandler(async (event) => {
  const body = await readBody(event)

  // 管理员或父课程的任课教师可新增章节
  if (body.courseId) {
    await requireCourseTeacher(event, Number(body.courseId))
  } else {
    await requireAdmin(event)
  }

  try {
    // content 支持直接传 markdown 字符串（自动转 tiptap doc）
    if (body.content !== undefined) {
      body.content = normalizeContent(body.content)
    }
    // 读取课程 lmsConfig.course.defaultChapterOpen，若未显式传 isOpen 则用合并后的默认值
    if (body.isOpen === undefined && body.courseId) {
      const course = await db
        .select({ config: schema.courses.config })
        .from(schema.courses)
        .where(eq(schema.courses.id, Number(body.courseId)))
        .limit(1)
      const cfg = (course[0]?.config as Record<string, any>) || {}
      const courseLms = mergeCourseLmsConfig(cfg)
      body.isOpen = courseLms?.course?.defaultChapterOpen ?? true
    }

    const result = await addTable('chapters', body)
    return cResp(result)
  } catch (error: any) {
    console.error('新增章节失败:', error)
    return cResp(null, error.message || '新增失败', false)
  }
})
