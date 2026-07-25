/**
 * LMS AI 助手默认配置
 *
 * ai.llmApiKey / ai.llmApiUrl / ai.model 可被 process.env 覆盖（cache.ts 优先级最高）。
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
