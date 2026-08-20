/**
 * 全局安全响应头中间件（M5：点击劫持防护）
 *
 * 对所有响应统一添加：
 * - X-Frame-Options: SAMEORIGIN（旧浏览器，禁止跨域 iframe 嵌入）
 * - Content-Security-Policy: frame-ancestors 'self'（CSP3，仅允许同源 iframe 嵌入，
 *   既阻止外部恶意站点点击劫持，又允许站内编辑器用 iframe 嵌入本站页面）
 * - X-Content-Type-Options: nosniff（禁止 MIME 嗅探）
 *
 * 说明：
 * - 中间件在业务 handler 之前执行；个别端点（如 /api/files/serve 的 SVG）会在
 *   handler 内主动覆盖 Content-Security-Policy 为更严格的策略，不受影响。
 * - 仅加 frame-ancestors 指令不会限制页面自身的脚本/样式，安全无副作用。
 */

export default defineEventHandler((event) => {
  setResponseHeaders(event, {
    'X-Frame-Options': 'SAMEORIGIN',
    'Content-Security-Policy': "frame-ancestors 'self'",
    'X-Content-Type-Options': 'nosniff',
  })
})
