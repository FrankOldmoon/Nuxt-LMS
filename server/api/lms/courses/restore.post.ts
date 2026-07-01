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
    .from(schema.courseVersions)
    .where(eq(schema.courseVersions.id, Number(versionId)))
    .limit(1)

  if (!rows[0]) {
    return cResp(null, '版本不存在', false)
  }

  const version = rows[0]
  const courseId = version.courseId

  // 权限：管理员或课程编辑者
  await requireCourseTeacher(event, courseId)

  try {
    // 先将当前内容保存为版本（便于撤销恢复），再写回历史版本内容
    const current = await showTable('courses', courseId)
    const oldContent = (current as any)?.content
    if (oldContent !== undefined && oldContent !== null) {
      await saveContentVersion('course', courseId, oldContent)
    }
    await updateTable('courses', courseId, { content: version.content })
    return cResp({ success: true })
  } catch (error: any) {
    console.error('恢复课程版本失败:', error)
    return cResp(null, error.statusMessage || '恢复失败', false)
  }
})
