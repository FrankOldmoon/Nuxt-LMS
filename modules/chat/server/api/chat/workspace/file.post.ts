/**
 * 写入/覆盖工作区文件（前端手动编辑、或工具链回写都走这里）
 * POST /api/chat/workspace/file
 * body: { conversation_id, path, content }
 */
import { writeWorkspaceFile, requireConversation } from '../../../utils/workspace'

export default eventHandler(async (event) => {
  const body = await readBody(event).catch(() => ({} as any))
  const id = Number(body?.conversation_id) || 0
  const { user, conv } = await requireConversation(event, id)

  try {
    const r = await writeWorkspaceFile(conv.id, user.id, String(body?.path || ''), String(body?.content ?? ''))
    return cResp({ path: r.file.path, size: r.file.size, created: r.created })
  } catch (e: any) {
    return cResp(null, e?.message || '写入失败', false)
  }
})
