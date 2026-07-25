/**
 * 客户端初始化：监听章节访问权限变更的 WS 通知
 *
 * 当教师切换章节 isOpen 或 class_chapter.open 后，服务端通过 WS 广播
 * chapterAccessUpdate 消息。学生收到后，若正在查看同一课程，则触发
 * 侧边栏导航刷新（清除缓存 + 重新请求），实时更新章节锁定状态。
 */
export default defineNuxtPlugin(() => {
  if (!import.meta.client) return

  const { onChapterAccessUpdate } = useWebSocket()
  const { notifyCourseNavUpdate } = useLayoutState()
  const route = useRoute()

  onChapterAccessUpdate((data) => {
    // 仅当学生正在查看被变更的课程时才刷新，避免无关课程的不必要请求
    const match = route.path.match(/^\/course\/([^/]+)/)
    const currentCourseId = match?.[1]
    if (currentCourseId && String(data.courseId) === currentCourseId) {
      notifyCourseNavUpdate()
    }
  })
})
