/**
 * 执行服务端工具
 * POST /api/chat/workspace/tool
 * body: { conversation_id, name, args }
 *
 * 前端 agent 循环拿到模型的 tool_calls 后：
 * - run_python → 浏览器本地跑（不来这里）
 * - 其余 → 打这个接口，拿返回字符串作为 tool 消息
 */
import { requireConversation } from '../../../utils/workspace'
import { executeServerTool, CLIENT_TOOLS } from '../../../utils/tools'

export default eventHandler(async (event) => {
  const body = await readBody(event).catch(() => ({} as any))
  const id = Number(body?.conversation_id) || 0
  const { user, conv } = await requireConversation(event, id)

  const name = String(body?.name || '')
  if (!name) return cResp(null, '缺少 name', false)
  if ((CLIENT_TOOLS as readonly string[]).includes(name)) {
    return cResp(null, `${name} 是客户端工具，需在浏览器执行`, false)
  }

  const args = body?.args && typeof body.args === 'object' ? body.args : {}
  const result = await executeServerTool(name, args, { conversationId: conv.id, userId: user.id })

  // 工具执行结果一律 success（失败信息作为文本回给模型，让它自己纠正）
  return cResp({ result })
})
