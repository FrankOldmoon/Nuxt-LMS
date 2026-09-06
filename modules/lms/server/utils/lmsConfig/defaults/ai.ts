/**
 * LMS AI 助手默认配置
 *
 * ai.llmApiKey / ai.llmApiUrl / ai.model：DB（系统设置）优先，process.env 仅在为空时兜底。
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
