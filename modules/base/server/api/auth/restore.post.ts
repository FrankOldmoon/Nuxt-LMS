/**
 * Restore original identity (auto-called on page refresh after impersonation login)
 * POST /api/auth/restore
 *
 * Check original_token cookie, restore original identity if it exists
 */
export default defineEventHandler(async (event) => {
  const originalToken = getCookie(event, 'original_token')
  const currentToken = getCookie(event, 'auth_token')

  if (!originalToken || !currentToken) {
    return cResp({ restored: false }, 'No restoration needed')
  }

  // Restore original token
  setCookie(event, 'auth_token', originalToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 7, // 7 days
    path: '/',
  })

  // Clear original_token
  deleteCookie(event, 'original_token', { path: '/' })

  return cResp({ restored: true }, 'Original identity restored')
})
