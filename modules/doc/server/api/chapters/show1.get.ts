import { db, schema } from "@nuxthub/db"
import { eq } from "drizzle-orm"

/**
 * 章节详情 API（doc 基础版）
 *
 * 模块覆盖说明：
 * - lms 模块启用时，本文件会被 `lms/server/api/chapters/show.ts` 覆盖（基于文件名约定 + 注册顺序）
 * - lms 关闭时本文件生效，提供纯 doc 模式行为
 *
 * doc 模式行为（无 lms 增强）：
 * - 不做班级 gating（lms 模式下才有 classChapters/userClasses 表）
 * - 不查询 userChapter（lms 模式下才有 userChapters 表）
 * - 不附加 isOpen / classChapters（accessBar 仅在 lms 模式下渲染）
 * - 所有登录/未登录用户均可访问任意章节
 *
 * 故意不导入 schema.userClasses / schema.classChapters / schema.userChapters 等 lms 专有表，
 * 保持本文件在 lms 关闭时也能干净运行，避免误删 lmsEnabled 守卫后引用不存在的表而崩溃。
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

  // doc 模式：不传 userChapter，normalizeChapterPageData 内部不会附加 taskStatus / isPass
  const result = normalizeChapterPageData(chapter, chapter.course)

  return cResp(result)
})
