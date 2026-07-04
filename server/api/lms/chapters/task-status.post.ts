import { db, schema } from "@nuxthub/db"
import { eq, and } from "drizzle-orm"

/**
 * 持久化当前用户在某章节的 heading 任务完成状态
 * body: { chapter_id, task_status: { [headingId]: boolean }, is_pass: boolean }
 *
 * 客户端负责计算每个 heading 的完成状态（文字停留 5s / 提交全部答对），
 * 这里仅做 upsert 持久化；is_pass 由客户端根据全部 heading 完成情况计算。
 */
export default eventHandler(async (event) => {
  const user = await requireAuth(event)

  const body = await readBody(event)
  const chapterId = Number(body.chapter_id)
  if (!chapterId) {
    return cResp(null, '缺少 chapter_id 参数', false)
  }

  const taskStatus = (body.task_status && typeof body.task_status === 'object')
    ? body.task_status
    : {}
  const isPass = !!body.is_pass

  try {
    const existing = await db.query.userChapters.findFirst({
      where: and(eq(schema.userChapters.userId, user.id), eq(schema.userChapters.chapterId, chapterId)),
    })

    if (existing) {
      await db.update(schema.userChapters).set({
        taskStatus,
        isPass,
      }).where(and(eq(schema.userChapters.userId, user.id), eq(schema.userChapters.chapterId, chapterId)))
    } else {
      await db.insert(schema.userChapters).values({
        userId: user.id,
        chapterId,
        taskStatus,
        isPass,
      })
    }

    return cResp({ isPass })
  } catch (error: any) {
    console.error('保存章节任务状态失败:', error)
    return cResp(null, error.statusMessage || '保存失败', false)
  }
})
