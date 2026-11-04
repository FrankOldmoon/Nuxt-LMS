/**
 * 读取工作区单个文件
 * GET /api/chat/workspace/file?conversation_id=1&path=main.py
 */
import { readWorkspaceFile, requireConversation, normalizePath } from '../../../utils/workspace'

export default eventHandler(async (event) => {
  const q = getQuery(event)
  const id = Number(q.conversation_id) || 0
  const { conv } = await requireConversation(event, id)

  let path = ''
  try { path = normalizePath(String(q.path || '')) } catch (e: any) { return cResp(null, e.message, false) }

  const row = await readWorkspaceFile(conv.id, path)
  if (!row) return cResp(null, '文件不存在', false)
  return cResp(row)
})
