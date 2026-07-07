/**
 * AI Chat 代理接口
 * POST /api/aichat/chat
 *
 * body: { messages, model?, thinking? }
 *
 * API Key / API URL 从 .env 读取（AI_API_KEY / AI_API_URL），
 * 前端不再传递敏感信息；model 可由前端覆盖，默认取 AI_MODEL 或 gpt-4o-mini
 * 返回 SSE 流式响应（逐块透传，不缓冲）
 */
export default eventHandler(async (event) => {
    const user = await requireAuth(event)

    const body = await readBody(event)
    const { messages, model, thinking } = body

    // 从环境变量读取敏感配置
    const apiKey = process.env.AI_API_KEY
    const apiUrl = process.env.AI_API_URL

    if (!apiKey) {
        return cResp(null, '服务器未配置 AI_API_KEY', false)
    }
    if (!apiUrl) {
        return cResp(null, '服务器未配置 AI_API_URL', false)
    }
    if (!Array.isArray(messages) || !messages.length) {
        return cResp(null, 'messages 不能为空', false)
    }

    const url = apiUrl.replace(/\/$/, '') + '/chat/completions'
    const defaultModel = model || process.env.AI_MODEL || 'gpt-4o-mini'

    // 构建请求体
    const requestBody: Record<string, any> = {
        model: defaultModel,
        messages,
        stream: true,
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

    // 使用 sendStream 逐块透传上游 SSE 流（不缓冲）
    return sendStream(event, upstream.body)
})
