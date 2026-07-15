import { ref, computed, watch, type ComputedRef } from 'vue'

export function useAside() {
  const { hasRole, user } = useAuth()
  const { isCourseEditor } = useAuthLms()
  const nav = useSidebarNav()
  const { navigation, courseId, refresh, courseApiUrl } = nav
  // lms extensionField，doc environmentDowncancan undefined，makeusecanoptional chain protection
  const accessibleChapterIds: ComputedRef<Set<number>> | undefined = (nav as any).accessibleChapterIds
  const passedChapterIds: ComputedRef<Set<number>> | undefined = (nav as any).passedChapterIds

  const { courseNavVersion } = useLayoutState()

  const contentPickerOpen = ref(false)
  const classModalOpen = ref(false)

  // listenNavigationVersion change，ClearCacheandRefresh
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

  // PermissionsandLoginStatus
  const canEditCourse = computed(() => hasRole('admin') || isCourseEditor(Number(courseId.value)))
  const isLoggedIn = computed(() => !!user.value)
  const selectedClassName = computed(() => user.value?.defaultClass?.name || '')

  // lms specific：withNumberFrontprefixNavigation（for CourseBtns etc.makeuse）
  const indexedNavigation = computed(() => {
    return indexNavItems(navigation.value, '', true)
  })

  // -------------- NavigationitemsConvertlogic --------------
  // DefaultConvert：lms mode downAutoaddUpNumber、Lock、Completemark；Elsedirectly pass through
  const navItems = computed(() => {
    return transformNavItems(navigation.value)
  })

  // recursively markCompletedChapter
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

  // recursively mark unOnputChapter disabled
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

  // calculateFirstitemsTagandLink
  const firstNavLabel = computed(() => navItems.value[0]?.label ?? '')
  const courseHomeUrl = computed(() => navItems.value[0]?.to ?? `/course/${courseId.value}`)
  const restNavItems = computed(() => navItems.value.slice(1))

  return {
    courseId, indexedNavigation, isLoggedIn, selectedClassName,
    classModalOpen, canEditCourse, contentPickerOpen, courseHomeUrl,
    firstNavLabel, navigation, handle saved, restNavItems,
  }
}
