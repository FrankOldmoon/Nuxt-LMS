/**
 * Client-side initialization: listen for WS notifications of chapter access permission changes
 *
 * When a teacher toggles a chapter's isOpen or a class_chapter's open state, the server
 * broadcasts a chapterAccessUpdate message over WS. After students receive it, if they
 * are viewing the same course, the sidebar navigation refresh is triggered
 * (clear cache + re-fetch) to update the chapter lock status in real time.
 */
export default defineNuxtPlugin(() => {
  if (!import.meta.client) return

  const { onChapterAccessUpdate } = useWebSocket()
  const { notifyCourseNavUpdate } = useLayoutState()
  const route = useRoute()

  onChapterAccessUpdate((data) => {
    // Only refresh when the student is viewing the affected course, to avoid unnecessary requests for unrelated courses
    const match = route.path.match(/^\/course\/([^/]+)/)
    const currentCourseId = match?.[1]
    if (currentCourseId && String(data.courseId) === currentCourseId) {
      notifyCourseNavUpdate()
    }
  })
})
