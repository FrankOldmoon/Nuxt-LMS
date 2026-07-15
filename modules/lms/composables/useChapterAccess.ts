import { toRef } from 'vue'

export interface ChapterAccessProps {
  chapterId: number
  courseId: number
  chapterData?: {
    isOpen?: boolean
    classChapters?: { classId: number; open: boolean }[]
  }
}

/**
 * useChapterAccess — Chapter access control
 *
 * Handles permission checks, state synchronization, and updates for the chapter open toggle + class multi-select.
 * Extracted from accessBar.vue; the component is only responsible for UI rendering.
 */
export function useChapterAccess(props: ChapterAccessProps) {
  const { t } = useI18n()
  const toast = useToast()
  const { hasRole } = useAuth()
  const { isCourseTeacher } = useAuthLms()
  const { classes, loadClasses } = useClasses()

  const canEdit = computed(() => {
    if (hasRole('admin')) return true
    return props.courseId ? isCourseTeacher(props.courseId) : false
  })

  const isOpen = ref(false)
  const savingOpen = ref(false)
  const selectedClassIds = ref<number[]>([])

  // Class options (from global cache)
  const classOptions = computed(() =>
    classes.value.map(c => ({ label: c.name, value: c.id })),
  )

  // Sync local state from props.chapterData
  // Key fixes:
  // 1) Wrap props.chapterData with toRef to get a stable reactive reference, avoiding getter invalidation during SSR/hydration
  // 2) Add deep:true to ensure internal property changes are captured (parent component's cRequest.use onMounted refresh
  //    creates a new chapter object reference, but after production minification the shallow watch occasionally fails to trigger)
  // 3) Remove the `if (!data) return` guard, uniformly use optional chaining to handle undefined
  // 4) Force another sync in onMounted as a fallback for SSR/hydration boundary timing differences
  const chapterDataRef = toRef(props, 'chapterData')

  function syncFromChapterData(data: ChapterAccessProps['chapterData']) {
    isOpen.value = !!data?.isOpen
    selectedClassIds.value = (data?.classChapters || []).filter(c => c.open).map(c => c.classId)
  }

  watch(chapterDataRef, syncFromChapterData, { immediate: true, deep: true })
  onMounted(() => syncFromChapterData(props.chapterData))

  // Update chapter isOpen
  async function updateOpen(val: boolean) {
    savingOpen.value = true
    try {
      await cRequest('/api/chapters/update', {
        method: 'POST',
        body: { id: props.chapterId, isOpen: val },
      })
      toast.add({ title: t('chapter.openUpdated'), color: 'success' })
    } catch (e: any) {
      toast.add({ title: e.message || t('chapter.openUpdateFailed'), color: 'error' })
      isOpen.value = !val
    } finally {
      savingOpen.value = false
    }
  }

  // Update class open status
  async function updateClassOpen(ids: number[]) {
    try {
      const classList = classes.value.map(c => ({
        classId: c.id,
        open: ids.includes(c.id),
      }))
      await cRequest('/api/chapters/classes', {
        method: 'POST',
        body: { chapterId: props.chapterId, classes: classList },
      })
      toast.add({ title: t('chapter.openUpdated'), color: 'success' })
    } catch (e: any) {
      toast.add({ title: e.message || t('chapter.openUpdateFailed'), color: 'error' })
    }
  }

  // Load the class list for the first time (global cache)
  loadClasses()

  return {
    canEdit,
    isOpen,
    savingOpen,
    selectedClassIds,
    classOptions,
    updateOpen,
    updateClassOpen,
  }
}
