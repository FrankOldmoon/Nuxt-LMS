/**
 * AI Chat 代理接口
 * POST /api/aichat/chat
 *
 * body: { messages, model?, thinking? }
 *
 * API Key / API URL 从 lms_config.ai 读取（DB 优先，env AI_API_KEY / AI_API_URL / AI_MODEL 仅在为空时兜底），
 * 前端不再传递敏感信息；model 可由前端覆盖，默认取 lms_config.ai.model 或 glm-4.5-air
 * 返回 SSE 流式响应（逐块透传，不缓冲），并在流结束前附加 model 与 usage 元数据
 */
// 题目代做检测（与 /chat agent 共用同一套规则）
import { detectHomeworkIntent, buildHomeworkGuardMessage } from '../../../../base/utils/aiGuard'

// 用户级速率限制：LLM 调用成本高，防止单用户刷 API 额度（滑动窗口，内存存储）
const CHAT_WINDOW_MS = 60_000
const CHAT_RATE_LIMIT_MAX = 20
const userChatHits = new Map<number, number[]>()

export default eventHandler(async (event) => {
    const user = await requireAuth(event)

    // 频控：每用户每分钟最多 CHAT_RATE_LIMIT_MAX 次
    const now = Date.now()
    const hits = (userChatHits.get(user.id) || []).filter((t) => t > now - CHAT_WINDOW_MS)
    hits.push(now)
    userChatHits.set(user.id, hits)
    if (hits.length > CHAT_RATE_LIMIT_MAX) {
        return cResp(null, '请求过于频繁，请稍后再试', false)
    }

    const body = await readBody(event)
    const { messages, model, thinking } = body

    // 从 lms_config.ai 读取敏感配置（reloadLmsConfig 中已应用 env 兜底：DB 值优先）
    const aiConfig = getLmsConfigSync().ai || {}
    const apiKey = aiConfig.llmApiKey
    const apiUrl = aiConfig.llmApiUrl

    if (!apiKey) {
        return cResp(null, '服务器未配置 AI API Key（请在系统设置或 .env AI_API_KEY 中配置）', false)
    }
    if (!apiUrl) {
        return cResp(null, '服务器未配置 AI API URL（请在系统设置或 .env AI_API_URL 中配置）', false)
    }
    if (!Array.isArray(messages) || !messages.length) {
        return cResp(null, 'messages 不能为空', false)
    }

    // 安全：限制 model 只能是非空短字符串（防前端注入任意/超长 model 名）
    const safeModel = typeof model === 'string' && model.trim() && model.length <= 100
        ? model.trim()
        : undefined
    // 安全：限制 messages 条数与单条长度，防止刷额度/超长上下文
    const MAX_MESSAGES = 50
    const MAX_MESSAGE_LEN = 20000
    const safeMessages = messages.slice(0, MAX_MESSAGES).map((m: any) => {
        if (m && typeof m === 'object') {
            const c = typeof m.content === 'string' ? m.content.slice(0, MAX_MESSAGE_LEN) : m.content
            return { ...m, content: c }
        }
        return m
    })

    // 兼容两种配置写法：base URL（https://host/v1）或完整端点（已含 /chat/completions）
    const trimmed = apiUrl.replace(/\/$/, '')
    const url = /\/chat\/completions$/.test(trimmed) ? trimmed : trimmed + '/chat/completions'
    const defaultModel = safeModel || aiConfig.model || "glm-4.5-air";

    // 构建请求体
    // 代做题目检测：与 /chat 的 agent 同一套规则（base/utils/aiGuard）。
    // 命中时不硬拒，而是插入教学模式指令 —— 讲考点、逐项分析，但不给最终答案。
    // 前端 useChatbox 已注入过时跳过，避免重复两条一样的指令。
    const alreadyGuarded = safeMessages.some(
        (m: any) => m?.role === 'system' && String(m.content || '').includes('【教学模式'),
    )
    const userMsgs = safeMessages.filter((m: any) => m?.role === 'user')
    const lastUser = userMsgs[userMsgs.length - 1]
    const prevUser = userMsgs[userMsgs.length - 2]
    let intent = alreadyGuarded ? null : (lastUser ? detectHomeworkIntent(String(lastUser.content || '')) : null)
    // 短追问（"那到底哪个"）本身没特征，沿用上一条是题目的判断
    if (!intent && !alreadyGuarded && lastUser && prevUser && String(lastUser.content || '').trim().length < 30) {
        intent = detectHomeworkIntent(String(prevUser.content || ''))
    }

    let finalMessages: any[] = safeMessages
    if (intent) {
        const guard = { role: 'system', content: buildHomeworkGuardMessage(intent) }
        // 前端可能已带 system（preset），要插在它后面，别打乱角色顺序
        finalMessages = safeMessages[0]?.role === 'system'
            ? [safeMessages[0], guard, ...safeMessages.slice(1)]
            : [guard, ...safeMessages]
    }

    const requestBody: Record<string, any> = {
        model: defaultModel,
        messages: finalMessages,
        stream: true,
        // 让上游在最后一个 chunk 中附带 usage（prompt_tokens / completion_tokens / total_tokens）
        stream_options: { include_usage: true },
    }

    // 开启思考模式（GLM 等模型支持）。仅显式开启时发送；
    // 部分模型（如 glm-5.3-flash）始终思考、不支持 disabled，省略字段以兼容
    if (thinking) requestBody.thinking = { type: 'enabled' }

    // 转发到 OpenAI 兼容接口，请求流式响应
    const upstream = await fetch(url, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`,
        },
        body: JSON.stringify(requestBody),
    })

    if (!upstream.ok) {
        const errText = await upstream.text()
        // 仅截断返回错误摘要，避免向上游/客户端泄露完整敏感信息
        const brief = String(errText || '').slice(0, 200)
        return cResp({ status: upstream.status, error: brief }, `AI 接口请求失败: ${upstream.status}`, false)
    }

    // 设置 SSE 响应头
    setResponseHeader(event, 'Content-Type', 'text/event-stream')
    setResponseHeader(event, 'Cache-Control', 'no-cache, no-transform')
    setResponseHeader(event, 'Connection', 'keep-alive')
    setResponseHeader(event, 'X-Accel-Buffering', 'no')

    // 自定义透传：读取上游 SSE 字节流，逐行解析 data: 事件。
    // 找到包含 usage 的最后一个 chunk 后，把它原样转发给客户端（model 与 usage 已在该 chunk 中）。
    // 这样前端只需在流结束时读取最后一条 data 事件即可拿到 model + token 用量，无需解析第二遍。
    const reader = upstream.body!.getReader()
    const decoder = new TextDecoder()
    // 记录最近一次的 model 名称（最后一个 chunk 通常 choices 为空但带 model，若上游漏发则回退到 defaultModel）
    let lastModel = defaultModel

    const stream = new ReadableStream({
        async start(controller) {
            let buffer = ''
            try {
                while (true) {
                    const { done, value } = await reader.read()
                    if (done) break
                    // 透传原始字节给客户端（不修改上游的 SSE 帧，确保 model / usage 完整保留）
                    controller.enqueue(value)
                    // 仅在本地按行解析：用于检测 [DONE]、提取 model / usage（不修改透传给客户端的字节）
                    buffer += decoder.decode(value, { stream: true })
                    const lines = buffer.split('\n')
                    buffer = lines.pop() || ''
                    for (const line of lines) {
                        const trimmed = line.trim()
                        if (!trimmed.startsWith('data:')) continue
                        const data = trimmed.slice(5).trim()
                        if (data === '[DONE]') continue
                        try {
                            const parsed = JSON.parse(data)
                            // 持续追踪最近的 model 名（最后一个 chunk 通常 choices 为空但带 model）
                            if (parsed.model) lastModel = parsed.model
                            // 含 usage 的 chunk 为流结束块：服务端 console.log 记录用量
                            if (parsed.usage) {
                                //console.log('[aichat/chat] model:', lastModel, 'usage:', parsed.usage)
                            }
                        } catch { /* skip malformed chunk */ }
                    }
                }
                // 上游未显式发 [DONE] 也能正常收尾
                controller.close()
            } catch (err) {
                controller.error(err)
            } finally {
                try { reader.releaseLock() } catch { /* noop */ }
            }
        },
    })

    return sendStream(event, stream)
})
