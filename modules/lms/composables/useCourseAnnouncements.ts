import { inject, provide, type InjectionKey } from 'vue'

const AnnouncementsKey = Symbol('Announcements') as InjectionKey<ReturnType<typeof useCourseAnnouncements>>

export function provideAnnouncements(ctx: ReturnType<typeof useCourseAnnouncements>) {
  provide(AnnouncementsKey, ctx)
}

export function useAnnouncementsContext() {
  const ctx = inject(AnnouncementsKey)
  if (!ctx) throw new Error('useAnnouncementsContext must be used within announcementsModal')
  return ctx
}

/**
 * Course announcement modal: load announcements/class list, publish/delete announcements (permission controlled)
 */
export function useCourseAnnouncements(
  props: { courseId: string | number },
  isOpen: Ref<boolean>,
) {
  const { t } = useI18n()
  const { hasRole, isCourseTeacher } = useAuth()
  const toast = useToast()

  // Reactive state
  const pending = ref(false)
  const creating = ref(false)
  const showCreateForm = ref(false)
  const announcements = ref<any[]>([])
  const classes = ref<any[]>([])

  const form = ref({
    name: '',
    contentText: '',
    classIds: [] as number[],
  })

  // Computed properties
  const classMap = computed(() => {
    const map = new Map<number, { id: number; name: string }>()
    for (const cls of classes.value) {
      map.set(Number(cls.id), cls)
    }
    return map
  })

  // Permission check: admin / system teacher / course teacher can publish announcements
  const canCreate = computed(() => {
    const cid = Number(props.courseId)
    if (!cid) return false
    return hasRole('admin')
      || hasRole('teacher')
      || isCourseTeacher(cid)
  })

  // Utility functions
  function toggleClass(id: number, checked: boolean) {
    const set = new Set(form.value.classIds)
    if (checked) set.add(id)
    else set.delete(id)
    form.value.classIds = Array.from(set)
  }

  function formatTime(time: any): string {
    if (!time) return ''
    const date = new Date(time)
    if (isNaN(date.getTime())) return ''
    return date.toLocaleString()
  }

  /**
   * Render content (compatible with plain text / JSON format Tiptap document)
   * Announcement body is displayed as plain text
   */
  function renderContent(content: any): string {
    if (content == null) return ''
    if (typeof content === 'string') {
      try {
        const obj = JSON.parse(content)
        if (obj && typeof obj === 'object') return extractText(obj)
      } catch {
        return content
      }
      return content
    }
    if (typeof content === 'object') return extractText(content)
    return String(content)
  }

  function toggleCreateForm() {
    showCreateForm.value = !showCreateForm.value
    if (!showCreateForm.value) {
      form.value = { name: '', contentText: '', classIds: [] }
    }
  }

  // Data loading
  async function loadData() {
    if (!props.courseId) return
    pending.value = true
    try {
      // Load class list for teacher role, used to select target classes when publishing
      if (canCreate.value) {
        const classRes = await cRequest<any>('/api/classes/list')
        const data = (classRes as any)?.data
        classes.value = Array.isArray(data) ? data : (Array.isArray(classRes) ? classRes : [])
      }
      // Load announcement list
      const annRes = await cRequest<any>('/api/announcements/list', {
        query: { courseId: Number(props.courseId) },
      })
      const data = (annRes as any)?.data
      announcements.value = Array.isArray(data) ? data : (Array.isArray(annRes) ? annRes : [])
    } catch (e: any) {
      console.error('Failed to load announcements', e)
      toast.add({
        title: t('announcement.loadFailed'),
        description: e?.message,
        color: 'error',
      })
    } finally {
      pending.value = false
    }
  }

  // Action methods
  async function createAnnouncement() {
    if (!form.value.name.trim()) return
    creating.value = true
    try {
      await cRequest('/api/announcements/add', {
        method: 'POST',
        body: {
          courseId: Number(props.courseId),
          name: form.value.name.trim(),
          content: form.value.contentText || null,
          classIds: form.value.classIds,
        },
      })
      toast.add({ title: t('announcement.createSuccess'), color: 'success' })
      showCreateForm.value = false
      form.value = { name: '', contentText: '', classIds: [] }
      await loadData()
    } catch (e: any) {
      toast.add({
        title: t('announcement.createFailed'),
        description: e?.message || String(e),
        color: 'error',
      })
    } finally {
      creating.value = false
    }
  }

  async function deleteAnnouncement(id: number) {
    try {
      await cRequest('/api/announcements/delete', {
        method: 'POST',
        body: { id },
      })
      await loadData()
    } catch (e: any) {
      toast.add({
        title: t('announcement.deleteFailed'),
        description: e?.message || String(e),
        color: 'error',
      })
    }
  }

  // Auto load data when modal opens
  watch(isOpen, (val) => {
    if (val) loadData()
  })

  return {
    pending,
    creating,
    showCreateForm,
    announcements,
    classes,
    form,
    classMap,
    canCreate,
    toggleClass,
    formatTime,
    renderContent,
    toggleCreateForm,
    loadData,
    createAnnouncement,
    deleteAnnouncement,
  }
}
