/**
 * LMS AI assistant default config
 *
 * ai.llmApiKey / ai.llmApiUrl / ai.model can be overridden by process.env (highest priority in cache.ts).
 */
export const aiDefaults = {
  enabled: true,
  mode: 'api',
  model: '',
  thinking: false,
  apiUrl: '/api/aichat/chat',
  llmApiUrl: '',
  llmApiKey: '',
  ollamaUrl: 'http://localhost:11434',
  ollamaModel: '',
  title: '',
  preset: '',
  opening: '',
  ttsGender: 'female',
}
