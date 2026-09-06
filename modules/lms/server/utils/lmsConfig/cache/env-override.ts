/**
 * AI 配置 env 变量兜底
 *
 * 优先级：process.env（仅兜底）< DB 存储（lms-config UI 填写的值优先）
 * 在 reloadLmsConfig 末尾调用：只对 DB/默认值中为空的字段用 .env 补齐，
 * 不覆盖系统设置里已填写的值。
 */

/** 将 env 兜底应用到已 unflatten 的 cfg.ai 上（仅补空字段） */
export function applyEnvOverride(cfg: any): void {
  const env = process.env
  if (!cfg.ai) cfg.ai = {}
  if (!cfg.ai.llmApiKey && env.AI_API_KEY) cfg.ai.llmApiKey = env.AI_API_KEY
  if (!cfg.ai.llmApiUrl && env.AI_API_URL) cfg.ai.llmApiUrl = env.AI_API_URL
  if (!cfg.ai.model && env.AI_MODEL) cfg.ai.model = env.AI_MODEL
}
