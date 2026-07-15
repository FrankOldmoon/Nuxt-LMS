/**
 * AI config env variable override
 *
 * Priority: DB storage < process.env (highest)
 * Called at the end of reloadLmsConfig to ensure the three sensitive ai.* fields follow .env.
 */

/** Apply env overrides to the unflattened cfg.ai */
export function applyEnvOverride(cfg: any): void {
  const env = process.env
  if (!cfg.ai) cfg.ai = {}
  if (env.AI_API_KEY) cfg.ai.llmApiKey = env.AI_API_KEY
  if (env.AI_API_URL) cfg.ai.llmApiUrl = env.AI_API_URL
  if (env.AI_MODEL) cfg.ai.model = env.AI_MODEL
}
