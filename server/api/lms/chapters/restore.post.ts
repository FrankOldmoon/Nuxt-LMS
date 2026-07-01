import { db, schema } from "@nuxthub/db"
import { eq } from "drizzle-orm"

export default eventHandler(async (event) => {
  const body = await readBody(event)
  const { versionId } = body

  if (!versionId) {
    return cResp(null, '缺少 versionId 参数', false)
  }

  // 查询目标版本
  const rows = await db
    .select()
    .from(schema.chapterVersions)
    .where(eq(schema.chapterVersions.id, Number(versionId)))
    .limit(1)

  if (!rows[0]) {
    return cResp(null, '版本不存在', false)
  }

  const version = rows[0]
  const chapterId = version.chapterId

  // 权限：管理员或章节所属课程的编辑者
  await requireChapterTeacher(event, chapterId)

  try {
    // 先将当前内容保存为版本（便于撤销恢复），再写回历史版本内容
    const current = await showTable('chapters', chapterId)
    const oldContent = (current as any)?.content
    if (oldContent !== undefined && oldContent !== null) {
      await saveContentVersion('chapter', chapterId, oldContent)
    }
    await updateTable('chapters', chapterId, { content: version.content })
    return cResp({ success: true })
  } catch (error: any) {
    console.error('恢复章节版本失败:', error)
    return cResp(null, error.statusMessage || '恢复失败', false)
  }
})
