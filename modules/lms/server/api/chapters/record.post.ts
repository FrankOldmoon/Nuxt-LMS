import { db, schema } from "@nuxthub/db"
import { eq, and } from "drizzle-orm"

/**
 * 保存当前用户在某章节的 record（tiptap JSON，含内联 question 节点）
 * body: { chapter_id, record: tiptapJSON }
 */
export default eventHandler(async (event) => {
  const user = await requireAuth(event)

  const body = await readBody(event)
  const chapterId = Number(body.chapter_id)
  if (!chapterId) {
    return cResp(null, '缺少 chapter_id 参数', false)
  }

  const record = body.record || null

  try {
    const existing = await db.query.userChapters.findFirst({
      where: and(eq(schema.userChapters.userId, user.id), eq(schema.userChapters.chapterId, chapterId)),
    })

    if (existing) {
      await db.update(schema.userChapters)
        .set({ record })
        .where(and(eq(schema.userChapters.userId, user.id), eq(schema.userChapters.chapterId, chapterId)))
    } else {
      await db.insert(schema.userChapters)
        .values({ userId: user.id, chapterId, record })
    }
    return cResp({ ok: true })
  } catch (error: any) {
    console.error('保存 chapter record 失败:', error)
    return cResp(null, error.message || '保存失败', false)
  }
})
