/**
 * OpenAI 兼容对外网关 - Models 列表
 * GET /api/openai/v1/models
 *
 * 返回系统配置的默认模型（ai.model），供 OpenAI SDK 客户端做连通性 / 可用模型校验。
 * 鉴权与限流同 chat/completions。
 */
export default eventHandler(async (event) => {
  if (!checkOpenAiRateLimit(event)) {
    return openaiError(event, 429, 'Too Many Requests', 'rate_limit_exceeded')
  }
  if (!verifyOpenAiToken(event)) {
    return openaiError(event, 401, 'Invalid API key provided.', 'invalid_api_key')
  }

  const ai = getLmsConfigSync().ai || {}
  const model = typeof ai.model === 'string' && ai.model.trim() ? ai.model.trim() : OPENAI_GATEWAY_DEFAULT_MODEL
  return {
    object: 'list',
    data: [{ id: model, object: 'model', created: 0, owned_by: 'lms' }],
  }
})
