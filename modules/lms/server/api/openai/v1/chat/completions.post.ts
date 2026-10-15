/**
 * OpenAI 兼容对外网关 - Chat Completions
 * POST /api/openai/v1/chat/completions
 *
 * 外部系统以 OpenAI SDK / curl 调用：base_url = <lms>/api/openai/v1，
 * api_key = 系统设置 → AI 的 API Key（ai.llmApiKey）。
 * 上游配置从 system config（lms_config.ai）读取：
 * - ai.llmApiUrl：上游 OpenAI 兼容服务地址（base URL 或完整端点均可）
 * - ai.llmApiKey：转发上游的 Bearer Token，同时是外部调用方的鉴权 Token
 *
 * 请求体原样透传（stream / temperature / tools 等字段均保留），仅 model 缺省时回填
 * ai.model；不注入 thinking / stream_options，保持最大兼容。
 * stream=true 走 SSE 字节流透传，否则透传 JSON。
 */
export default eventHandler(async (event) => {
  // 频控：每 IP 每分钟 60 次（LLM 调用成本高，防刷额度）
  if (!checkOpenAiRateLimit(event)) {
    return openaiError(event, 429, 'Too Many Requests', 'rate_limit_exceeded')
  }

  // 鉴权：Bearer Token 必须与系统配置的 api_token 一致；未配置则端点视为关闭
  const token = verifyOpenAiToken(event)
  if (!token) {
    return openaiError(event, 401, 'Invalid API key provided.', 'invalid_api_key')
  }

  const ai = getLmsConfigSync().ai || {}
  const apiUrl = ai.llmApiUrl
  if (!apiUrl) {
    return openaiError(event, 500, 'Server is not configured: missing AI API URL (system settings).')
  }

  const body = await readBody(event)
  if (!body || !Array.isArray(body.messages) || !body.messages.length) {
    return openaiError(event, 400, "'messages' is a required property and must be a non-empty array.")
  }

  // model 缺省时回填（不覆盖调用方显式指定的模型）
  if (!body.model || typeof body.model !== 'string' || !body.model.trim()) {
    body.model = ai.model || OPENAI_GATEWAY_DEFAULT_MODEL
  }

  // 转发上游：请求体原样透传
  let upstream: any
  try {
    upstream = await fetch(resolveUpstreamChatUrl(apiUrl), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify(body),
    })
  } catch {
    return openaiError(event, 502, 'Failed to reach upstream AI API.')
  }

  // 上游错误：透传状态码 + 截断错误摘要（避免向上游/调用方泄露完整敏感信息）
  if (!upstream.ok) {
    const brief = String(await upstream.text().catch(() => '')).slice(0, 200)
    return openaiError(event, upstream.status || 502, `Upstream AI API error (${upstream.status}): ${brief}`)
  }

  // 流式：SSE 响应头 + 字节流逐块透传（不修改上游 SSE 帧）
  if (body.stream === true) {
    setResponseHeaders(event, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no',
    })
    const reader = upstream.body.getReader()
    const stream = new ReadableStream({
      async start(controller) {
        try {
          while (true) {
            const { done, value } = await reader.read()
            if (done) break
            controller.enqueue(value)
          }
          controller.close()
        } catch (err) {
          controller.error(err)
        } finally {
          try { reader.releaseLock() } catch { /* noop */ }
        }
      },
    })
    return sendStream(event, stream)
  }

  // 非流式：JSON 透传
  return upstream.json()
})
