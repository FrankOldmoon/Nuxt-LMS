/**
 * OpenAI 网关 CORS 预检
 * OPTIONS /api/openai/v1/chat/completions
 *
 * Access-Control-Allow-* 头由 nuxt.config 的 routeRules（/api/openai/** cors:true）统一附加，
 * 这里补 204 状态码让浏览器预检通过（附 max-age 减少预检次数）
 */
export default defineEventHandler((event) => {
  setResponseHeader(event, 'Access-Control-Max-Age', '86400')
  setResponseStatus(event, 204)
  return null
})
