/**
 * Chapter student selection modal logic
 *
 * - selectedIds: currently selected student ids
 * - randomSelect: lottery-style random flashing highlight of N students
 * - adjustScore: batch add/subtract score for selected students (POST /api/courses/marks)
 *
 * Student data comes from the global useClassUsers() (cached by classId + courseId).
 * isOpen is passed in from timerModal via v-model:open; load data onOpen, reset on close.
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

  // Close all open UPopovers (after clicking confirm / cancel)
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

    // Fast random flashing, simulating lottery animation
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
      console.error('Failed to load students', e)
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
