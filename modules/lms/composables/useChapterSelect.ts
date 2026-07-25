/**
 * 章节学生选择弹窗逻辑
 *
 * - selectedIds：当前选中的学生 id
 * - randomSelect：抽奖式随机闪烁高亮 N 个学生
 * - adjustScore：对选中学生批量加减分（POST /api/courses/marks）
 *
 * 学生数据来自全局 useClassUsers()（按 classId + courseId 缓存）。
 * isOpen 由 timerModal 通过 v-model:open 传入；打开时加载数据，关闭时复位。
 */
export function useChapterSelect(
  props: { courseId: number; classId: number },
  isOpen: Ref<boolean>,
) {
  const { t } = useI18n()
  const toast = useToast()
  const { students, fetchUsers } = useClassUsers()

  const loading = ref(false)
  const saving = ref(false)
  const randomizing = ref(false)
  const selectedIds = ref<number[]>([])
  const randomCount = ref(1)
  const customScore = ref<number>(10)

  // 关闭所有打开的 UPopover（点击确认 / 取消后）
  function closePopovers() {
    document.querySelectorAll('[data-state="open"][role="dialog"]').forEach(el => {
      ;(el as HTMLElement).click()
    })
  }

  function toggleSelect(id: number) {
    const idx = selectedIds.value.indexOf(id)
    if (idx >= 0) selectedIds.value.splice(idx, 1)
    else selectedIds.value.push(id)
  }

  function selectAll() {
    selectedIds.value = students.value.map(s => s.id)
  }

  function clearSelection() {
    selectedIds.value = []
  }

  let randomTimer: ReturnType<typeof setInterval> | null = null

  function randomSelect() {
    if (randomizing.value || !students.value.length) return
    randomizing.value = true
    selectedIds.value = []

    const count = Math.min(randomCount.value || 1, students.value.length)
    const allIds = students.value.map(s => s.id)

    // 快速随机闪烁，模拟抽奖动画
    let ticks = 0
    const maxTicks = 20
    randomTimer = setInterval(() => {
      const shuffled = [...allIds].sort(() => Math.random() - 0.5)
      selectedIds.value = shuffled.slice(0, count)
      ticks++
      if (ticks >= maxTicks) {
        if (randomTimer) {
          clearInterval(randomTimer)
          randomTimer = null
        }
        randomizing.value = false
      }
    }, 80)
  }

  async function adjustScore(delta: number) {
    if (!props.courseId || !selectedIds.value.length || saving.value || delta === 0) return
    saving.value = true
    try {
      await cRequest('/api/courses/marks', {
        method: 'POST',
        body: {
          course_id: props.courseId,
          user_ids: selectedIds.value,
          delta,
        },
      })
      toast.add({ title: t('chapter.scoreUpdated'), color: 'success' })
      closePopovers()
    } catch (e: any) {
      toast.add({ title: e.message || t('chapter.scoreUpdateFailed'), color: 'error' })
    } finally {
      saving.value = false
    }
  }

  async function loadData() {
    if (!props.classId || !props.courseId) return
    selectedIds.value = []
    loading.value = true
    try {
      await fetchUsers(props.classId, props.courseId)
    } catch (e) {
      console.error('加载学生失败', e)
    } finally {
      loading.value = false
    }
  }

  watch(isOpen, (val) => {
    if (val) {
      loadData()
    } else {
      selectedIds.value = []
      customScore.value = 10
      if (randomTimer) {
        clearInterval(randomTimer)
        randomTimer = null
      }
      randomizing.value = false
    }
  })

  onBeforeUnmount(() => {
    if (randomTimer) {
      clearInterval(randomTimer)
      randomTimer = null
    }
  })

  return {
    loading, saving, randomizing, students, selectedIds, randomCount, customScore,
    closePopovers, toggleSelect, selectAll, clearSelection, randomSelect, adjustScore,
  }
}
