/**
 * 客户端初始化时检查是否需要恢复原始身份
 * 模拟学生身份后刷新页面会自动调用 /api/auth/restore 恢复
 */
export default defineNuxtPlugin(async () => {
  if (import.meta.client) {
    // 检查 localStorage 标记（impersonate 时设置）
    const isImpersonating = localStorage.getItem('impersonating')
    if (isImpersonating === 'true') {
      try {
        await cRequest('/api/auth/restore', { method: 'POST' })
        localStorage.removeItem('impersonating')
        // 刷新页面以恢复原始身份的 UI
        window.location.reload()
      } catch {
        // 静默忽略
      }
    }
  }
})
