/**
 * Public (no auth required): returns a safe subset of the LMS public config
 *
 * Excludes sensitive groups:
 *   - ai.llmApiKey / ai.llmApiUrl (used by server-side chat proxy, not exposed to frontend)
 *   - _system.* (system flags, e.g. testAccountsSeeded)
 *
 * Includes groups:
 *   - home / courseList / chapterPage (page visibility toggles)
 *   - course (course feature toggles, shared by chapter page/course page/course settings panel)
 *   - chapterBtns / courseBtns (button visibility, injected into layout state by the chapter page)
 *   - user (user-side feature toggles, including allowChangePassword/Email/Locale/ExportData/SelfAvatarUpload)
 *   - chapter.passScore (chapter passing score, may be shown publicly)
 *   - Public ai fields (mode/model/apiUrl/ollamaUrl/ollamaModel/title/preset/opening/ttsGender/thinking/enabled)
 *     -> kept consistent with /api/config/ai; specific stripping is done via selectKeys
 *
 * Called by useLmsPublicConfig(); WS broadcast 'lms-config-changed' triggers automatic refresh.
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
      // Nested fields (ai.* / chapter.passScore)
      const [section, field] = key.split('.')
      if (cfg[section] && cfg[section][field] !== undefined) {
        if (!out[section]) out[section] = {}
        out[section][field] = cfg[section][field]
      }
    } else {
      // Whole section
      if (cfg[key] !== undefined) {
        out[key] = cfg[key]
      }
    }
  }

  // ai object must exist (frontend useAiConfig expects to read .mode/.model etc. from ai)
  if (!out.ai) out.ai = {}

  return cResp(out)
})
