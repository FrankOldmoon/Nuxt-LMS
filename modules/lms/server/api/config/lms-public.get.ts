/**
 * 公开（无鉴权）：返回 LMS 公开配置的安全子集
 *
 * 排除敏感分组：
 *   - ai.llmApiKey / ai.llmApiUrl（服务端 chat 代理用，不暴露前端）
 *   - _system.*（系统标记位，如 testAccountsSeeded）
 *
 * 包含分组：
 *   - home / courseList / chapterPage（页面显隐开关）
 *   - course（课程功能开关，章节页/课程页/课程设置面板共用）
 *   - chapterBtns / courseBtns（按钮显隐，由章节页注入到 layout state）
 *   - user（用户端功能开关，含 allowChangePassword/Email/Locale/ExportData/SelfAvatarUpload）
 *   - chapter.passScore（章节及格分，可能用于公开显示）
 *   - 公开 ai 字段（mode/model/apiUrl/ollamaUrl/ollamaModel/title/preset/opening/ttsGender/thinking/enabled）
 *     → 与 /api/config/ai 保持一致；具体剥离通过 selectKeys 实现
 *
 * 由 useLmsPublicConfig() 调用，WS 广播 'lms-config-changed' 触发自动 refresh。
 */

const PUBLIC_KEYS = [
  'home',
  'courseList',
  'chapterPage',
  'course',
  'chapterBtns',
  'courseBtns',
  'user',
  'chapter.passScore',
  'ai.enabled',
  'ai.mode',
  'ai.model',
  'ai.thinking',
  'ai.apiUrl',
  'ai.ollamaUrl',
  'ai.ollamaModel',
  'ai.title',
  'ai.preset',
  'ai.opening',
  'ai.ttsGender',
] as const

export default defineEventHandler(() => {
  const cfg = getLmsConfigSync() || {}
  const out: Record<string, any> = {}

  for (const key of PUBLIC_KEYS) {
    if (key.includes('.')) {
      // 嵌套字段（chapter.passScore, ai.*）
      const [section, field] = key.split('.')
      if (!out[section]) out[section] = {}
      if (cfg[section] && cfg[section][field] !== undefined) {
        out[section][field] = cfg[section][field]
      }
    } else {
      // 整段
      if (cfg[key] !== undefined) {
        out[key] = cfg[key]
      }
    }
  }

  // ai 对象必存在（前端 useAiConfig 期望有 ai 对象可读 .mode/.model 等）
  if (!out.ai) out.ai = {}

  return cResp(out)
})
