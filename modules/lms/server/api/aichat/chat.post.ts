/**
 * AI Chat proxy endpoint
 * POST /api/aichat/chat
 *
 * body: { messages, model?, thinking? }
 *
 * API Key / API URL are read from lms_config.ai (env AI_API_KEY / AI_API_URL / AI_MODEL can override);
 * the frontend no longer carries sensitive info. model can be overridden by the frontend; defaults
 * to lms_config.ai.model or glm-4.5-air.
 * Returns a streaming SSE response (raw passthrough, not buffered) and appends model and usage
 * metadata before the stream ends.
 */
export default eventHandler(async (event) => {
    const user = await requireAuth(event)

    const body = await readBody(event)
    const { messages, model, thinking } = body

    // Read sensitive config from lms_config.ai (env overrides are already applied in reloadLmsConfig)
    const aiConfig = getLmsConfigSync().ai || {}
    const apiKey = aiConfig.llmApiKey
    const apiUrl = aiConfig.llmApiUrl

    if (!apiKey) {
        return cResp(null, 'AI API Key is not configured on the server (please configure it in system settings or via .env AI_API_KEY)', false)
    }
    if (!apiUrl) {
        return cResp(null, 'AI API URL is not configured on the server (please configure it in system settings or via .env AI_API_URL)', false)
    }
    if (!Array.isArray(messages) || !messages.length) {
        return cResp(null, 'messages cannot be empty', false)
    }

    const url = apiUrl.replace(/\/$/, '') + '/chat/completions'
    const defaultModel = model || aiConfig.model || "glm-4.5-air";

    // Build request body
    const requestBody: Record<string, any> = {
        model: defaultModel,
        messages,
        stream: true,
        // Ask upstream to include usage in the last chunk (prompt_tokens / completion_tokens / total_tokens)
        stream_options: { include_usage: true },
    }

    // Enable thinking mode (supported by GLM and similar models)
    requestBody.thinking = { type: thinking ? 'enabled' : 'disabled' }

    // Forward to the OpenAI-compatible endpoint and request a streaming response
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
        return cResp({ status: upstream.status, error: errText }, `AI request failed: ${upstream.status}`, false)
    }

    // Set SSE response headers
    setResponseHeader(event, 'Content-Type', 'text/event-stream')
    setResponseHeader(event, 'Cache-Control', 'no-cache, no-transform')
    setResponseHeader(event, 'Connection', 'keep-alive')
    setResponseHeader(event, 'X-Accel-Buffering', 'no')

    // Custom passthrough: read upstream SSE byte stream and parse data: events line by line.
    // After finding the last chunk that contains usage, forward it as-is to the client (model and
    // usage are already in that chunk). The frontend only needs to read the last data event at
    // the end of the stream to get model + token usage, without parsing twice.
    const reader = upstream.body!.getReader()
    const decoder = new TextDecoder()
    // Track the most recent model name (the last chunk usually has empty choices but includes model; fall back to defaultModel if upstream omits it)
    let lastModel = defaultModel

    const stream = new ReadableStream({
        async start(controller) {
            let buffer = ''
            try {
                while (true) {
                    const { done, value } = await reader.read()
                    if (done) break
                    // Pass raw bytes through to the client (do not modify upstream SSE frames, to keep model/usage intact)
                    controller.enqueue(value)
                    // Only parse locally by line: used to detect [DONE] and extract model/usage (does not modify the bytes passed to the client)
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
                            // Keep tracking the most recent model name (the last chunk usually has empty choices but includes model)
                            if (parsed.model) lastModel = parsed.model
                            // The chunk containing usage is the stream end block: server console.log records the usage
                            if (parsed.usage) {
                                //console.log('[aichat/chat] model:', lastModel, 'usage:', parsed.usage)
                            }
                        } catch { /* skip malformed chunk */ }
                    }
                }
                // Upstream did not send [DONE] explicitly; finish normally
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
