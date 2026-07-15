import { db, schema } from "@nuxthub/db"
import { eq, and } from "drizzle-orm"

/**
 * Save the current user's record for a chapter (tiptap JSON, with inline question nodes)
 * body: { chapter_id, record: tiptapJSON }
 */
export default eventHandler(async (event) => {
  const user = await requireAuth(event)

  const body = await readBody(event)
  const chapterId = Number(body.chapter_id)
  if (!chapterId) {
    return cResp(null, 'Missing chapter_id parameter', false)
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
    console.error('Failed to save chapter record:', error)
    return cResp(null, error.message || 'Save failed', false)
  }
})
