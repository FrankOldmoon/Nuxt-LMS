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
 * useChapterAccess — 章节访问控制
 *
 * 处理章节开放开关 + 班级多选的权限判断、状态同步与更新。
 * 从 accessBar.vue 抽离，组件仅负责 UI 渲染。
 */
export function useChapterAccess(props: ChapterAccessProps) {
  const { t } = useI18n()
  const toast = useToast()
  const { hasRole } = useAuth()
  const { isCourseTeacher, isCourseEditor } = useAuthLms()
  const { classes, loadClasses } = useClasses()
  // 开放状态变更后刷新侧边导航（accessible 缓存），使该班级用户立即可见对应章节
  const { notifyCourseNavUpdate } = useLayoutState()

  const canEdit = computed(() => {
    if (hasRole('admin')) return true
    return props.courseId ? isCourseTeacher(props.courseId) : false
  })

  // “对所有人开放”开关仅管理员与课程编辑者可见（教师不可见）
  const canManageOpen = computed(() => {
    if (hasRole('admin')) return true
    return props.courseId ? isCourseEditor(props.courseId) : false
  })

  const isOpen = ref(false)
  const savingOpen = ref(false)
  // 原始已选（含用户不可见班级），用于数据同步与提交
  const rawSelectedClassIds = ref<number[]>([])

  // 班级选项：仅当前用户可见的班级
  const classOptions = computed(() =>
    classes.value.map(c => ({ label: c.name, value: c.id })),
  )

  // 暴露给 UI 的已选值：过滤掉用户不可见的班级，避免下拉框匹配不到，也不让用户知情不可见班级的开放状态
  const selectedClassIds = computed<number[]>({
    get: () => {
      const visible = new Set(classes.value.map(c => c.id))
      return rawSelectedClassIds.value.filter(id => visible.has(id))
    },
    set: (ids) => { rawSelectedClassIds.value = ids },
  })

  // 从 props.chapterData 同步本地状态
  // 关键修复：
  // 1) 用 toRef 包装 props.chapterData，得到稳定的响应式引用，避免 SSR/hydration 时 getter 失效
  // 2) 加 deep:true 确保对象内部属性变化也能被捕获（父组件 cRequest.use 的 onMounted refresh
  //    会创建新的 chapter 对象引用，但生产压缩后浅 watch 偶有不触发的情况）
  // 3) 去掉 `if (!data) return` 守卫，统一用可选链处理 undefined
  // 4) onMounted 强制再同步一次，兜底 SSR/hydration 边界时序差异
  const chapterDataRef = toRef(props, 'chapterData')

  function syncFromChapterData(data: ChapterAccessProps['chapterData']) {
    isOpen.value = !!data?.isOpen
    rawSelectedClassIds.value = (data?.classChapters || []).filter(c => c.open).map(c => c.classId)
  }

  watch(chapterDataRef, syncFromChapterData, { immediate: true, deep: true })
  onMounted(() => syncFromChapterData(props.chapterData))

  // 更新章节 isOpen
  async function updateOpen(val: boolean) {
    savingOpen.value = true
    try {
      await cRequest('/api/chapters/update', {
        method: 'POST',
        body: { id: props.chapterId, isOpen: val },
      })
      invalidateChapterShowCache()
      notifyCourseNavUpdate() // 刷新侧边导航的章节可访问性
      toast.add({ title: t('chapter.openUpdated'), color: 'success' })
    } catch (e: any) {
      toast.add({ title: e.message || t('chapter.openUpdateFailed'), color: 'error' })
      isOpen.value = !val
    } finally {
      savingOpen.value = false
    }
  }

  // 更新班级开放状态
  async function updateClassOpen(ids: number[]) {
    try {
      // 仅提交用户可见的班级；不可见班级未在列表中，后端 upsert 不会改动其开放状态
      const classList = classes.value.map(c => ({
        classId: c.id,
        open: ids.includes(c.id),
      }))
      await cRequest('/api/chapters/classes', {
        method: 'POST',
        body: { chapterId: props.chapterId, classes: classList },
      })
      invalidateChapterShowCache()
      notifyCourseNavUpdate() // 刷新侧边导航的章节可访问性
      toast.add({ title: t('chapter.openUpdated'), color: 'success' })
    } catch (e: any) {
      toast.add({ title: e.message || t('chapter.openUpdateFailed'), color: 'error' })
    }
  }

  /**
   * 使 /api/chapters/show 的 useFetch 缓存失效（getCachedData 会回退到
   * payload/static 缓存返回旧数据，导致重进章节后 isOpen/classChapters 仍是旧值）。
   * 复用 useChapterPage 中 contentVersion 清缓存的同款做法：按精确 key 删除后，
   * 下次进入该章节会重新请求服务端拿到最新开放状态。
   */
  function invalidateChapterShowCache() {
    if (import.meta.server) return
    const nuxtApp = useNuxtApp()
    const key = `/api/chapters/show?id=${props.chapterId}`
    delete nuxtApp.payload.data[key]
    if (nuxtApp.static?.data) delete nuxtApp.static.data[key]
  }

  // 首次加载班级列表（全局缓存）：仅 admin / 本课程教师需要（访问控制条仅对他们渲染），
  // 未登录访客与学生不请求 /api/classes/list（该接口对非教师不可见）
  function loadClassesIfEditable() {
    if (canEdit.value) loadClasses()
  }
  loadClassesIfEditable()
  // auth 数据 hydration 完成后 canEdit 才可判定，就绪后补一次加载
  watch(canEdit, (v) => { if (v) loadClasses() })

  return {
    canEdit,
    canManageOpen,
    isOpen,
    savingOpen,
    selectedClassIds,
    classOptions,
    updateOpen,
    updateClassOpen,
  }
}
