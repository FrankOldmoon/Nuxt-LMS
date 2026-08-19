/**
 * AI Chat 代理接口
 * POST /api/aichat/chat
 *
 * body: { messages, model?, thinking? }
 *
 * API Key / API URL 从 lms_config.ai 读取（env AI_API_KEY / AI_API_URL / AI_MODEL 可覆盖），
 * 前端不再传递敏感信息；model 可由前端覆盖，默认取 lms_config.ai.model 或 glm-4.5-air
 * 返回 SSE 流式响应（逐块透传，不缓冲），并在流结束前附加 model 与 usage 元数据
 */
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

    // 从 lms_config.ai 读取敏感配置（reloadLmsConfig 中已应用 env 覆盖）
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

    const url = apiUrl.replace(/\/$/, '') + '/chat/completions'
    const defaultModel = model || aiConfig.model || "glm-4.5-air";

    // 构建请求体
    const requestBody: Record<string, any> = {
        model: defaultModel,
        messages,
        stream: true,
        // 让上游在最后一个 chunk 中附带 usage（prompt_tokens / completion_tokens / total_tokens）
        stream_options: { include_usage: true },
    }

    // 开启思考模式（GLM 等模型支持）
    requestBody.thinking = { type: thinking ? 'enabled' : 'disabled' }

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
        return cResp({ status: upstream.status, error: errText }, `AI 接口请求失败: ${upstream.status}`, false)
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
