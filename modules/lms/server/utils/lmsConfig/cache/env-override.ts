/**
 * AI 配置 env 变量覆盖
 *
 * 优先级：DB 存储 < process.env（最高）
 * 在 reloadLmsConfig 末尾调用，确保 ai.* 三个敏感字段以 .env 为准。
 */

/** 将 env 覆盖应用到已 unflatten 的 cfg.ai 上 */
export function applyEnvOverride(cfg: any): void {
  const env = process.env
  if (!cfg.ai) cfg.ai = {}
  if (env.AI_API_KEY) cfg.ai.llmApiKey = env.AI_API_KEY
  if (env.AI_API_URL) cfg.ai.llmApiUrl = env.AI_API_URL
  if (env.AI_MODEL) cfg.ai.model = env.AI_MODEL
}
