/**
 * Public endpoint to fetch the AI assistant configuration (lms_config.ai group)
 *
 * No login required: students browsing chapters need to read the AI config
 * (mode/model/ttsGender, etc.), which is public information just like the
 * site_config returned by /api/home.
 * Only the ai group is returned; other settings such as experience points are not exposed.
 * Sensitive fields (llmApiKey / llmApiUrl) are removed; these are only used by
 * the server-side chat.post.ts.
 */
export default eventHandler(() => {
  const ai = { ...getLmsConfigSync().ai }
  // Remove sensitive fields; do not expose them to the frontend
  delete ai.llmApiKey
  delete ai.llmApiUrl
  return cResp(ai)
})
