/**
 * 恢复原始身份（模拟登录后刷新页面时自动调用）
 * POST /api/auth/restore
 *
 * 检查 original_token cookie，如果存在则恢复原始身份
 */
export default defineEventHandler(async (event) => {
  const originalToken = getCookie(event, 'original_token')
  const currentToken = getCookie(event, 'auth_token')

  if (!originalToken || !currentToken) {
    return cResp({ restored: false }, '无需恢复')
  }

  // 恢复原始 token
  setCookie(event, 'auth_token', originalToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 7, // 7 天
    path: '/',
  })

  // 清除 original_token
  deleteCookie(event, 'original_token', { path: '/' })

  return cResp({ restored: true }, '已恢复原始身份')
})
