/**
 * 下载工作区文件
 * GET /api/chat/workspace/download?conversation_id=1&path=report.md
 */
import { readWorkspaceFile, requireConversation, normalizePath, mimeOf, isBinaryContent, B64_PREFIX } from '../../../utils/workspace'

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
  // inline=1 供预览器直接加载（img/iframe/STL loaders）——
  // attachment 会让浏览器强制下载，那些标签就拿不到内容
  const inline = String(q.inline || '') === '1'
  setResponseHeader(
    event,
    'Content-Disposition',
    `${inline ? 'inline' : 'attachment'}; filename*=UTF-8''${encodeURIComponent(filename)}`,
  )

  // 二进制文件（xlsx/docx/图片）存的是 base64:xxx，这里解码还原成字节流，
  // 否则浏览器拿到的是 base64 字符串，Excel 会报文件损坏
  if (isBinaryContent(row.content)) {
    const buf = Buffer.from(String(row.content).slice(B64_PREFIX.length), 'base64')
    setResponseHeader(event, 'Content-Length', buf.byteLength)
    return buf
  }

  return row.content || ''
})
