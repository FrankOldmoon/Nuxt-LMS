import type { ComputedRef, Ref } from 'vue'

/**
 * 课程详情页共享逻辑（doc / lms 通用）
 *
 * 提取自 pages/course/[id]/index.vue，消除 doc 与 lms 之间的 script 双改。
 * doc 调用时传 /api/courses/show，lms 调用时传 /api/lms/courses/show。
 *
 * lms 可在返回值基础上扩展 chapterTree（加 accessible/isPass）、
 * firstChapterUrl（排除不可访问章节）、progressPercent、按钮配置等。
 */
export function useCourseDetailPage(courseId: ComputedRef<string>, apiUrl: ComputedRef<string>) {
  const { setEditableContent, setEditableMeta, contentVersion, courseNavVersion, notifyCourseNavUpdate } = useLayoutState()
  const { hasRole, isCourseTeacher } = useAuth()
  const { refresh: refreshNav } = useSidebarNav()

  const { data: resp, pending, refresh } = cRequest.use<import('#shared/types/lms').LmsCourseDetail | null>(
    () => apiUrl.value,
    { default: () => null },
  )

  const course = computed(() => resp.value as import('#shared/types/lms').LmsCourseDetail | null)

  const canEdit = computed(() => {
    if (!courseId.value) return false
    return hasRole('admin') || isCourseTeacher(Number(courseId.value))
  })

  const hasContent = computed(() => {
    if (!course.value?.content) return false
    return Object.keys(course.value.content).length > 0
  })

  // 基础 chapterTree（id/label/to，不含 accessible/isPass — lms 可扩展）
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

  // 数据变化时设置可编辑内容
  watch(resp, (detail) => {
    if (!detail) return
    const content = detail?.content
    setEditableContent(content ?? null)
    if (detail?.id) setEditableMeta('courses', detail.id, detail.id)
  }, { immediate: true })

  // 内容保存成功后重新获取数据
  watch(contentVersion, () => refresh(), { flush: 'sync' })

  // 课程导航版本变化时刷新（参数化 key，适配 doc/lms 不同 API URL）
  watch(courseNavVersion, () => {
    const nuxtApp = useNuxtApp()
    const key = apiUrl.value
    if (nuxtApp.payload.data[key]) {
      delete nuxtApp.payload.data[key]
    }
    refresh()
    refreshNav()
  })

  // 课程导出
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

  // 保存导航/课程后刷新数据
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

  // ===== 教师管理 =====
  const teachersModalOpen = ref(false)
  const membersRef = ref<{ loadMembers: () => Promise<void> } | null>(null)
  const canManageTeachers = computed(() => hasRole('admin') && !!useRuntimeConfig().public.moduleLms)

  watch(teachersModalOpen, (val) => {
    if (val) {
      nextTick(() => membersRef.value?.loadMembers())
    } else {
      // 关闭弹窗后刷新课程数据以更新教师列表
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
