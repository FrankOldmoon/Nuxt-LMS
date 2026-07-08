/**
 * 公开获取 AI 助手配置（lms_config.ai 分组）
 *
 * 无需登录：学生浏览章节时需要读取 AI 配置（mode/model/ttsGender 等），
 * 与 /api/home 返回 site_config 同属公开信息。
 * 仅返回 ai 分组，不泄露经验值等其他配置。
 * 移除敏感字段（llmApiKey / llmApiUrl），这些仅服务端 chat.post.ts 使用。
 */
export default eventHandler(() => {
  const ai = { ...getLmsConfigSync().ai }
  // 移除敏感字段，不暴露给前端
  delete ai.llmApiKey
  delete ai.llmApiUrl
  return cResp(ai)
})
