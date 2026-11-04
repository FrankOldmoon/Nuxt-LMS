/**
 * 下载工作区文件
 * GET /api/chat/workspace/download?conversation_id=1&path=report.md
 */
import { readWorkspaceFile, requireConversation, normalizePath, mimeOf } from '../../../utils/workspace'

export default eventHandler(async (event) => {
  const q = getQuery(event)
  const id = Number(q.conversation_id) || 0
  const { conv } = await requireConversation(event, id)

  let path = ''
  try { path = normalizePath(String(q.path || '')) } catch (e: any) { return cResp(null, e.message, false) }

  const row = await readWorkspaceFile(conv.id, path)
  if (!row) return cResp(null, '文件不存在', false)

  const filename = path.split('/').pop() || 'file.txt'
  setResponseHeader(event, 'Content-Type', mimeOf(path))
  setResponseHeader(event, 'Content-Disposition', `attachment; filename*=UTF-8''${encodeURIComponent(filename)}`)
  return row.content || ''
})
