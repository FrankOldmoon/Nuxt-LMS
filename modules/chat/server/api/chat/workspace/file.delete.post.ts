/**
 * 删除工作区文件
 * POST /api/chat/workspace/file/delete
 * body: { conversation_id, path }
 */
import { deleteWorkspaceFile, requireConversation, normalizePath } from '../../../utils/workspace'

export default eventHandler(async (event) => {
  const body = await readBody(event).catch(() => ({} as any))
  const id = Number(body?.conversation_id) || 0
  const { conv } = await requireConversation(event, id)

  let path = ''
  try { path = normalizePath(String(body?.path || '')) } catch (e: any) { return cResp(null, e.message, false) }

  const ok = await deleteWorkspaceFile(conv.id, path)
  if (!ok) return cResp(null, '文件不存在', false)
  return cResp({ path })
})
