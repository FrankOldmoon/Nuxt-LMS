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
 * 课程公告弹窗：加载公告/班级列表、发布/删除公告（权限受控）
 */
export function useCourseAnnouncements(
  props: { courseId: string | number },
  isOpen: Ref<boolean>,
) {
  const { t } = useI18n()
  const { hasRole } = useAuth()
  const { isCourseTeacher } = useAuthLms()
  const toast = useToast()

  // 响应式状态
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

  // 计算属性
  const classMap = computed(() => {
    const map = new Map<number, { id: number; name: string }>()
    for (const cls of classes.value) {
      map.set(Number(cls.id), cls)
    }
    return map
  })

  // 权限判断：管理员 / 系统教师 / 本课程教师可发布公告
  const canCreate = computed(() => {
    const cid = Number(props.courseId)
    if (!cid) return false
    return hasRole('admin')
      || hasRole('teacher')
      || isCourseTeacher(cid)
  })

  // 工具函数
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
   * 渲染 content（兼容纯文本 / JSON 格式 Tiptap 文档）
   * 公告正文取纯文本展示
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

  // 数据加载
  async function loadData() {
    if (!props.courseId) return
    pending.value = true
    try {
      // 教师身份加载班级列表，用于发布时选择目标班级
      if (canCreate.value) {
        const classRes = await cRequest<any>('/api/classes/list')
        const data = (classRes as any)?.data
        classes.value = Array.isArray(data) ? data : (Array.isArray(classRes) ? classRes : [])
      }
      // 加载公告列表
      const annRes = await cRequest<any>('/api/announcements/list', {
        query: { courseId: Number(props.courseId) },
      })
      const data = (annRes as any)?.data
      announcements.value = Array.isArray(data) ? data : (Array.isArray(annRes) ? annRes : [])
    } catch (e: any) {
      console.error('加载公告失败', e)
      toast.add({
        title: t('announcement.loadFailed'),
        description: e?.message,
        color: 'error',
      })
    } finally {
      pending.value = false
    }
  }

  // 操作方法
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

  // 弹窗打开时自动加载数据
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
