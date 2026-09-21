/**
 * 课程全局排行：本课程得分前 10 名学生（跨班级，排除教师）
 * 数据来自 /api/courses/global-leaderboard，行内含班级名称（users.class_id）。
 */
export function useCourseGlobalLeaderboard(
  props: { courseId: string | number },
  isOpen: Ref<boolean>,
) {
  const loading = ref(false)
  const rows = ref<any[]>([])
  const { levelStep } = useLmsPublicConfig()

  const step = computed(() => Number(levelStep.value) || 100)

  async function loadData() {
    if (!props.courseId) return
    loading.value = true
    try {
      const params = new URLSearchParams({ courseId: String(props.courseId) })
      const data = await cRequest<any>(`/api/courses/global-leaderboard?${params}`)
      rows.value = (data?.rows || []).map((r: any) => ({
        ...r,
        // 经验 → 等级（跟随配置的升级曲线）
        lv: expToLevel(Number(r.exp) || 0, step.value),
      }))
    } catch (e) {
      console.error('加载全局排行失败', e)
    } finally {
      loading.value = false
    }
  }

  watch(isOpen, (val) => {
    if (val) loadData()
  })

  return { loading, rows, loadData }
}
