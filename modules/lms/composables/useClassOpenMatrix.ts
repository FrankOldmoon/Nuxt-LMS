/**
 * 课程「章节 × 班级」开放状态矩阵：加载章节、班级及其开放状态
 */
export function useClassOpenMatrix(
  props: { courseId: string | number },
  isOpen: Ref<boolean>,
) {
  const loading = ref(false)
  const chapters = ref<any[]>([])
  const classes = ref<any[]>([])
  const openMap = ref<Record<number, Record<number, boolean>>>({})

  function isOpenFor(chapterId: number, classId: number): boolean {
    return !!openMap.value?.[chapterId]?.[classId]
  }

  async function loadData() {
    if (!props.courseId) return
    loading.value = true
    try {
      const params = new URLSearchParams({ courseId: String(props.courseId) })
      const data = await cRequest<any>(`/api/courses/class-open-matrix?${params}`)
      chapters.value = data?.chapters || []
      classes.value = data?.classes || []
      openMap.value = data?.openMap || {}
    } catch (e) {
      console.error('加载章节×班级开放矩阵失败', e)
    } finally {
      loading.value = false
    }
  }

  watch(isOpen, (val) => {
    if (val) loadData()
  })

  return { loading, chapters, classes, openMap, isOpenFor, loadData }
}