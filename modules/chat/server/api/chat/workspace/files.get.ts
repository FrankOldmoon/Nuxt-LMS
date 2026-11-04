/**
 * 工作区文件列表
 * GET /api/chat/workspace/files?conversation_id=1
 */
import { listWorkspaceFiles, requireConversation } from '../../../utils/workspace'

export default eventHandler(async (event) => {
  const q = getQuery(event)
  const id = Number(q.conversation_id) || 0
  const { conv } = await requireConversation(event, id)
  const files = await listWorkspaceFiles(conv.id)
  return cResp(files)
})
