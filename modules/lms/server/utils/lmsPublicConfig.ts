/**
 * LMS 公开配置的安全子集（排除敏感分组：ai.llmApiKey / ai.llmApiUrl / _system.*）
 *
 * 抽出为函数，供两个入口复用：
 * - GET /api/config/lms-public（单独拉取）
 * - GET /api/bootstrap（与站点配置 / 首页数据合并成一次首屏请求）
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
  'general.levelStep',
  'oj',
  'codeflow',
  'ai.enabled',
  'ai.chatEnabled',
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
  'analytics',
] as const

/** LMS 公开配置安全子集（同步，读内存中的 lms 配置缓存） */
export function getLmsPublicConfig() {
  const cfg = getLmsConfigSync() || {}
  const out: Record<string, any> = {}

  for (const key of PUBLIC_KEYS) {
    if (key.includes('.')) {
      // 嵌套字段（ai.* / chapter.passScore）
      const [section, field] = key.split('.')
      if (cfg[section] && cfg[section][field] !== undefined) {
        if (!out[section]) out[section] = {}
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

  return out
}
