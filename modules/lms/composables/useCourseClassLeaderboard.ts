/**
 * 各班在本课程的生均得分排行：加载数据 + 表格行
 */
export function useCourseClassLeaderboard(
  props: { courseId: string | number },
  isOpen: Ref<boolean>,
) {
  const loading = ref(false)
  const rows = ref<any[]>([])

  async function loadData() {
    if (!props.courseId) return
    loading.value = true
    try {
      const params = new URLSearchParams({ courseId: String(props.courseId) })
      const data = await cRequest<any>(`/api/courses/class-leaderboard?${params}`)
      rows.value = data?.rows || []
    } catch (e) {
      console.error('加载各班生均分排行失败', e)
    } finally {
      loading.value = false
    }
  }

  watch(isOpen, (val) => {
    if (val) loadData()
  })

  return { loading, rows, loadData }
}