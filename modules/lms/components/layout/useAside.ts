import { ref, computed, watch, type ComputedRef } from 'vue'

export function useAside() {
  const { hasRole, user } = useAuth()
  const { isCourseEditor } = useAuthLms()
  const nav = useSidebarNav()
  const { navigation, courseId, refresh, courseApiUrl } = nav
  // lms 扩展字段，doc 环境下可能为 undefined，使用可选链保护
  const accessibleChapterIds: ComputedRef<Set<number>> | undefined = (nav as any).accessibleChapterIds
  const passedChapterIds: ComputedRef<Set<number>> | undefined = (nav as any).passedChapterIds

  const { courseNavVersion } = useLayoutState()

  const contentPickerOpen = ref(false)
  const classModalOpen = ref(false)

  // 监听导航版本变化，清除缓存并刷新
  watch(courseNavVersion, () => {
    const nuxtApp = useNuxtApp()
    const key = courseApiUrl.value
    if (nuxtApp.payload.data[key]) {
      delete nuxtApp.payload.data[key]
    }
    refresh()
  })

  async function handleSaved() {
    const nuxtApp = useNuxtApp()
    const key = courseApiUrl.value
    if (nuxtApp.payload.data[key]) {
      delete nuxtApp.payload.data[key]
    }
    await refresh()
  }

  // 权限与登录状态
  const canEditCourse = computed(() => hasRole('admin') || isCourseEditor(Number(courseId.value)))
  const isLoggedIn = computed(() => !!user.value)
  const selectedClassName = computed(() => user.value?.defaultClass?.name || '')

  // lms 专属：带序号前缀的导航（供 CourseBtns 等使用）
  const indexedNavigation = computed(() => {
    return indexNavItems(navigation.value, '', true)
  })

  // -------------- 导航项转换逻辑 --------------
  // 默认转换：lms 模式下自动加上序号、锁定、完成标记；否则直接透传
  const navItems = computed(() => {
    return transformNavItems(navigation.value)
  })

  // 递归标记已完成章节
  function markPassed(items: any[]): any[] {
    return items.map((item) => {
      const newItem: any = { ...item }
      if (item.to) {
        const match = String(item.to).match(/\/course\/[^/]+\/(\d+)$/)
        if (match && passedChapterIds?.value.has(Number(match[1]))) {
          newItem.badge = { label: '✓', color: 'success' }
        }
      }
      if (item.children?.length) {
        newItem.children = markPassed(item.children)
      }
      return newItem
    })
  }

  function transformNavItems(items: any[]): any[] {
    const indexed = indexNavItems(items, '', true)
    const base = canEditCourse.value ? indexed : markNavDisabled(indexed)
    return markPassed(base as any[])
  }

  // 递归标记未开放章节为 disabled
  function markNavDisabled(items: any[]): any[] {
    return items.map((item) => {
      const newItem: any = { ...item }
      if (item.to) {
        const match = String(item.to).match(/\/course\/[^/]+\/(\d+)$/)
        if (match && accessibleChapterIds && !accessibleChapterIds.value.has(Number(match[1]))) {
          newItem.disabled = true
          newItem.label = '🔒 ' + (item.label || '')
        }
      }
      if (item.children?.length) {
        newItem.children = markNavDisabled(item.children)
      }
      return newItem
    })
  }

  // 计算首项标签和链接
  const firstNavLabel = computed(() => navItems.value[0]?.label ?? '')
  const courseHomeUrl = computed(() => navItems.value[0]?.to ?? `/course/${courseId.value}`)
  const restNavItems = computed(() => navItems.value.slice(1))

  return {
    courseId, indexedNavigation, isLoggedIn, selectedClassName,
    classModalOpen, canEditCourse, contentPickerOpen, courseHomeUrl,
    firstNavLabel, navigation, handleSaved, restNavItems,
  }
}
