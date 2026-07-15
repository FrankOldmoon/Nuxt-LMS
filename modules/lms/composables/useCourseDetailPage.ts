import type { ComputedRef, Ref } from 'vue'

/**
 * Course detail page shared logic (generic for doc / lms)
 *
 * Extracted from pages/course/[id]/index.vue, eliminates script duplication between doc and lms.
 * doc calls with /api/courses/show, lms calls with /api/courses/show.
 *
 * lms can extend the return value with chapterTree (add accessible/isPass),
 * firstChapterUrl (exclude inaccessible chapters), progressPercent, button config, etc.
 */
export function useCourseDetailPage(courseId: ComputedRef<string>, apiUrl: ComputedRef<string>) {
  const { courseNavVersion, notifyCourseNavUpdate } = useLayoutState()
  const { hasRole } = useAuth()
  const { isCourseEditor, isCourseTeacher } = useAuthLms()
  const { refresh: refreshNav } = useSidebarNav()

  const { data: resp, pending, refresh } = cRequest.use<import('#lms/types/lms').LmsCourseDetail | null>(
    () => apiUrl.value,
    { default: () => null },
  )

  const course = computed(() => resp.value as import('#lms/types/lms').LmsCourseDetail | null)

  const canEdit = computed(() => {
    if (!courseId.value) return false
    return hasRole('admin') || isCourseTeacher(Number(courseId.value))
  })

  const hasContent = computed(() => {
    if (!course.value?.content) return false
    return Object.keys(course.value.content).length > 0
  })

  // Base chapterTree (id/label/to, without accessible/isPass — lms can extend)
  interface ChapterNode {
    id: number | string
    label: string
    to?: string
  }

  const chapterTree = computed<ChapterNode[]>(() => {
    if (!course.value) return []
    const chapters = course.value.chapters || []
    const orders = course.value.orders || []
    const cid = course.value.id
    const chapterMap = new Map(chapters.map(ch => [ch.id, ch]))

    if (orders.length > 0) {
      const sorted = [...orders].sort((a, b) => a.order - b.order)
      const rootItems = sorted.filter(o => !o.parentId)
      return rootItems.map(o => {
        const isChapter = o.id && !o.id.startsWith('custom-') && !isNaN(Number(o.id))
        return {
          id: isChapter ? Number(o.id) : o.id,
          label: o.label,
          to: isChapter ? `/course/${cid}/${o.id}` : (o.id === 'course' ? `/course/${cid}` : `/course/${cid}#${o.label}`),
        }
      })
    }

    return chapters.map(ch => ({
      id: ch.id,
      label: ch.title,
      to: `/course/${cid}/${ch.id}`,
    }))
  })

  const firstChapterUrl = computed(() => {
    const first = chapterTree.value.find(ch => ch.to && !ch.to.includes('#'))
    return first?.to
  })

  // Refresh when course nav version changes (parameterized key, adapts to doc/lms different API URLs)
  watch(courseNavVersion, () => {
    const nuxtApp = useNuxtApp()
    const key = apiUrl.value
    if (nuxtApp.payload.data[key]) {
      delete nuxtApp.payload.data[key]
    }
    refresh()
    refreshNav()
  })

  // Course export
  const exporting = ref(false)
  async function exportCourse() {
    if (!courseId.value || exporting.value) return
    exporting.value = true
    try {
      const data = await cRequest<any>('/api/courses/export', {
        query: { id: courseId.value },
      })
      const courseName = data?.course?.name || 'course'
      const courseCode = data?.course?.code
      const ts = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)
      const safe = (s: string) => String(s).replace(/[\\/:*?"<>|]/g, '_')
      const fileName = `${safe(courseCode || courseName)}-${ts}.json`

      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = fileName
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    } catch (err: any) {
      console.error('export course failed', err)
    } finally {
      exporting.value = false
    }
  }

  // Refresh data after saving nav/course
  async function handleSaved() {
    const nuxtApp = useNuxtApp()
    const key = apiUrl.value
    if (nuxtApp.payload.data[key]) {
      delete nuxtApp.payload.data[key]
    }
    await refresh()
    await refreshNav()
    notifyCourseNavUpdate()
  }

  // ===== Teacher management =====
  const teachersModalOpen = ref(false)
  const membersRef = ref<{ loadMembers: () => Promise<void> } | null>(null)
  const canManageTeachers = computed(() => hasRole('admin') && !!useRuntimeConfig().public.moduleLms)

  watch(teachersModalOpen, (val) => {
    if (val) {
      nextTick(() => membersRef.value?.loadMembers())
    } else {
      // Refresh course data after closing modal to update teacher list
      handleSaved()
    }
  })

  return {
    resp, pending, refresh,
    course, canEdit, hasContent,
    chapterTree, firstChapterUrl,
    exporting, exportCourse, handleSaved,
    teachersModalOpen, membersRef, canManageTeachers,
  }
}
