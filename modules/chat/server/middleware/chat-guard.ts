/**
 * /chat 工作台总开关（系统设置 → AI 助手 → 显示 AI 对话工作台）
 *
 * 关闭后：
 * - /chat 页面 404（SSR 与 SPA 导航都拦得住）
 * - /api/chat/** 全部 404，避免绕过界面直接调 Agent 接口
 *
 * 配置读取走 lms 的 lms_config 缓存（getLmsConfigSync 由 lms 模块注册为自动导入）。
 * 字段缺省视为开启，兼容没有该字段的历史配置。
 */
export default defineEventHandler((event) => {
  const path = (event.path || '').split('?')[0] || ''
  const isChatPage = path === '/chat' || path.startsWith('/chat/')
  const isChatApi = path.startsWith('/api/chat/')
  if (!isChatPage && !isChatApi) return

  let enabled = true
  try {
    const cfg: any = getLmsConfigSync()
    enabled = cfg?.ai?.chatEnabled !== false
  } catch {
    // 配置不可读时放行，避免把整个模块锁死
    enabled = true
  }

  if (!enabled) {
    throw createError({ statusCode: 404, statusMessage: 'Not Found' })
  }
})
