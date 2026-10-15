/**
 * OpenAI 兼容对外网关共享工具
 *
 * 供 /api/openai/v1/* 端点使用（外部系统以 OpenAI SDK / curl 调用本站 LLM 能力）：
 * - api_url / api_token 复用系统设置 → AI 分组：ai.llmApiUrl（上游地址）、ai.llmApiKey（上游密钥）
 * - 外部调用方以 ai.llmApiKey 作为 Bearer Token，服务端校验一致后用同一 token 转发上游
 */

/** 每 IP 每分钟最多请求次数（LLM 调用成本高，防止单一来源刷额度） */
const RATE_WINDOW_MS = 60_000
const RATE_LIMIT_MAX = 60

/** IP → 窗口内请求时间戳列表（内存 Map，单实例部署场景，重启清空） */
const ipHits = new Map<string, number[]>()

/** 请求未指定 model 且系统设置 ai.model 为空时的兜底模型（与 aichat 一致） */
export const OPENAI_GATEWAY_DEFAULT_MODEL = 'glm-4.5-air'

/**
 * 以 OpenAI 错误格式返回响应：{ error: { message, type, code } }
 * type 按状态码推导：429 → rate_limit_error，5xx → api_error，其余 → invalid_request_error
 */
export function openaiError(event: any, status: number, message: string, code?: string | null) {
  setResponseStatus(event, status)
  const type = status === 429 ? 'rate_limit_error'
    : status >= 500 ? 'api_error'
    : 'invalid_request_error'
  return { error: { message, type, code: code ?? null } }
}

/**
 * 校验外部调用方 Bearer Token：必须与系统配置的 ai.llmApiKey 严格一致。
 * 通过返回该 token（转发上游复用），未配置 / 缺失 / 不匹配返回 null（端点视为关闭）。
 */
export function verifyOpenAiToken(event: any): string | null {
  const ai = getLmsConfigSync().ai || {}
  const expected = typeof ai.llmApiKey === 'string' ? ai.llmApiKey.trim() : ''
  if (!expected) return null
  const auth = String(getRequestHeader(event, 'authorization') || '').trim()
  const m = /^Bearer\s+(.+)$/i.exec(auth)
  const token = m ? m[1].trim() : ''
  return token && token === expected ? token : null
}

/**
 * 兼容两种配置写法：base URL（https://host/v1）或完整端点（已含 /chat/completions），
 * 统一归一化为完整 chat/completions 端点
 */
export function resolveUpstreamChatUrl(apiUrl: string): string {
  const trimmed = String(apiUrl || '').trim().replace(/\/$/, '')
  return /\/chat\/completions$/.test(trimmed) ? trimmed : trimmed + '/chat/completions'
}

/** 每 IP 每分钟滑动窗口限流；超限返回 false */
export function checkOpenAiRateLimit(event: any): boolean {
  const ip = getRequestIP(event) || 'unknown'
  const now = Date.now()
  const hits = (ipHits.get(ip) || []).filter((t) => t > now - RATE_WINDOW_MS)
  hits.push(now)
  ipHits.set(ip, hits)
  // 防止 Map 无限增长：条目过多时清理已过期 IP
  if (ipHits.size > 10_000) {
    for (const [k, v] of ipHits) {
      if (!v.some((t) => t > now - RATE_WINDOW_MS)) ipHits.delete(k)
    }
  }
  return hits.length <= RATE_LIMIT_MAX
}
