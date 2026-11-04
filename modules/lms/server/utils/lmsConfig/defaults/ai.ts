/**
 * LMS AI 助手默认配置
 *
 * ai.llmApiKey / ai.llmApiUrl / ai.model：DB（系统设置）优先，process.env 仅在为空时兜底。
 */
export const aiDefaults = {
  enabled: true,
  /** /chat 对话工作台：关闭后 header 机器人入口隐藏，/chat 页面与 /api/chat/** 一律 404 */
  chatEnabled: true,
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
