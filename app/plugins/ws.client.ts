/**
 * 客户端初始化：自动建立 WebSocket 连接，并监听邀请跳转
 */
export default defineNuxtPlugin(async () => {
  if (!import.meta.client) return

  const { connect, onInvite } = useWebSocket()

  // 建立连接
  connect()

  // 监听邀请：跳转到对应章节
  onInvite((data) => {
    if (data.courseId && data.chapterId) {
      const route = useRoute()
      const targetPath = `/course/${data.courseId}/${data.chapterId}`
      // 已在目标页面则不跳转
      if (route.path !== targetPath) {
        navigateTo(targetPath)
      }
    }
  })
})
