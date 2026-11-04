/**
 * 上传二进制文件到工作区
 * POST /api/chat/workspace/upload
 *
 * body: { conversation_id, path, data }  data 为 base64
 *
 * 文件在**浏览器里生成**（exceljs / docx 走客户端），服务端只负责落库。
 * 这样生成开销落在用户自己的机器上，不会因为并发导出把服务器 CPU 打满。
 */
import { requireConversation, normalizePath, writeWorkspaceBinary } from '../../../utils/workspace'

// base64 会让体积膨胀约 1/3，反推原始大小做前置校验
const MAX_B64 = Math.ceil((200 * 1024 * 4) / 3) + 1024

export default eventHandler(async (event) => {
  const user = await requireAuth(event)
  const body = await readBody(event)
  const id = Number(body?.conversation_id) || 0
  const { conv } = await requireConversation(event, id)

  let path = ''
  try { path = normalizePath(String(body?.path || '')) } catch (e: any) { return cResp(null, e.message, false) }

  const data = String(body?.data || '')
  if (!data) return cResp(null, '缺少文件内容', false)
  if (data.length > MAX_B64) return cResp(null, '文件超过 200KB 上限', false)

  try {
    const buf = Buffer.from(data, 'base64')
    const { file } = await writeWorkspaceBinary(conv.id, user.id, path, buf)
    return cResp({ path: file.path, size: file.size })
  } catch (e: any) {
    return cResp(null, e?.message || '保存失败', false)
  }
})
