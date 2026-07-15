import type { NavigationMenuItem } from '@nuxt/ui'
import type { LmsHomeData, LmsCourseDetail } from '#lms/types/lms'

/**
 * Module-level flag: WS handler is only registered once during the entire app lifecycle
 * On receiving 'home-changed', calls refreshNuxtData to trigger useFetch to re-fetch /api/home
 */
let _wsHandlerRegistered = false

/**
 * Get home page data (categories + course list + site config + unread counts)
 *
 * Singleton mechanism (consistent with useLmsPublicConfig / useSiteConfig):
 * - plugins/home-data.ts calls useFetch once at app startup
 * - Data is stored in useState('home-data'), all components share the same instance
 * - Client hydration is restored directly from the payload, no new request is made
 *
 * Real-time updates:
 * - WS broadcast 'home-changed' (triggered by categories/courses add|update|batch|delete|import)
 *   → triggers refreshNuxtData('home-singleton-fetch')
 *   → useFetch data updates → plugin watch syncs to useState → all computed values auto-update
 *
 * Benefits:
 * - Any component calling useHome() does not produce a new useFetch / new network request
 * - All components using home page data (useHeaderNav / pages/index.vue / etc.) share the same data
 * - After the server changes the navigation, all clients (including other tabs) sync in real time
 */
export function useHome() {
  const data = useState<LmsHomeData>('home-data', () => ({
    categories: [],
    courses: [],
    config: null as any,
    notifyUnread: 0,
    msgUnread: 0,
  }))

  // Client side: subscribe to server-side home-changed broadcast, auto refresh
  if (import.meta.client && !_wsHandlerRegistered) {
    _wsHandlerRegistered = true
    try {
      try { useWsConnection().connect() } catch { /* ignore */ }
      registerWsHandler('home-changed', () => {
        refreshNuxtData('home-singleton-fetch')
      })
    } catch {
      // WS module not enabled (base stub mode), silently ignore
    }
  }

  return {
    data,
    refresh: () => refreshNuxtData('home-singleton-fetch'),
  }
}

/**
 * Top navigation bar links (horizontal menu)
 * First level: course series; hover dropdown shows courses in that series
 * Data comes from useHome() — shared via useState as the same instance
 */
export function useHeaderNav() {
  const { refresh } = useHome()
  const { categories, getCoursesByCategory } = useHomeCourses()

  const links = computed<NavigationMenuItem[]>(() => {
    const base: NavigationMenuItem = { label: 'Home', icon: 'i-lucide-home', to: '/' }
    if (!categories.value.length) return [base]

    return [
      base,
      ...categories.value.map<NavigationMenuItem>((cat) => ({
        label: cat.title,
        icon: cat.icon,
        _meta: { type: 'category', id: String(cat.id) },
        children: getCoursesByCategory(cat.id).map((c) => ({
          label: c.title,
          to: `/course/${c.id}`,
          icon: c.icon,
          _meta: { type: 'course', id: String(c.id) },
        })),
      })),
    ]
  })

  return { links, refresh }
}

/**
 * Footer links
 * Course series part is dynamically obtained from home page data
 */
export function useFooterNav() {
  const { data: home } = useHome()

  const links = computed<{
    label: string
    children: { label: string; to: string; icon?: string }[]
  }[]>(() => {
    const categories = home.value?.categories ?? []
    return [
      {
        label: 'Course Series',
        children: categories.map((s) => ({
          label: s.title,
          to: `/?category=${s.id}#${s.id}`,
          icon: s.icon,
        })),
      }
    ]
  })

  return { links }
}

// ====================== Below is the doc course sidebar navigation ======================

function markDefaultOpen(items: NavigationMenuItem[], currentPath: string): boolean {
  let hasActive = false
  for (const item of items) {
    let childActive = false
    if (item.children?.length) {
      childActive = markDefaultOpen(item.children, currentPath)
    }
    const selfActive = !!item.to && item.to === currentPath
    if (childActive || selfActive) {
      ;(item as any).defaultOpen = true
      hasActive = true
    }
    if (selfActive) hasActive = true
  }
  return hasActive
}

export function useSidebarNav() {
  const route = useRoute()
  const { t } = useI18n()
  const { moduleLms } = useRuntimeConfig().public

  const courseId = computed(() => {
    const match = route.path.match(/^\/course\/([^/]+)/)
    return match?.[1] ?? ''
  })

  // When lms is enabled, uses /api/courses/show (includes accessible/isPass fields),
  // otherwise uses doc's /api/courses/show
  const courseApiUrl = computed(() => {
    if (!courseId.value) return ''
    const base = moduleLms ? '/api/courses/show' : '/api/courses/show'
    return `${base}?id=${courseId.value}`
  })

  const { data: courseData, refresh } = cRequest.use<LmsCourseDetail | null>(
    () => courseApiUrl.value,
    { default: () => null }
  )

  const navigation = computed<NavigationMenuItem[]>(() => {
    const cid = courseId.value
    if (!cid) return []

    const course = courseData.value
    if (!course) return []

    const currentPath = route.path
    const orders = course.orders ?? []
    const chapters = course.chapters ?? []
    const result: NavigationMenuItem[] = [{ label: t('course.home'), to: `/course/${cid}` }]
    if (orders.length > 0) {
      const sorted = [...orders].sort((a, b) => a.order - b.order)

      function buildItem(item: typeof sorted[number]): NavigationMenuItem {
        const base: NavigationMenuItem = { label: item.label, title: item.label }
        if (item.id && !item.id.startsWith('custom-') && !isNaN(Number(item.id))) {
          base.to = `/course/${cid}/${item.id}`
        } else if (item.id === 'course') {
          base.to = `/course/${cid}`
        } else {
          base.to = `/course/${cid}#${item.label}`
        }
        return base
      }

      const rootItems = sorted.filter((item) => !item.parentId)
      const tree: NavigationMenuItem[] = rootItems.map((root) => {
        const menuItem = buildItem(root)
        const children = sorted.filter((child) => child.parentId === root.id)
        if (children.length > 0) {
          menuItem.children = children.map((child) => {
            const childItem = buildItem(child)
            const grandchildren = sorted.filter((gc) => gc.parentId === child.id)
            if (grandchildren.length > 0) {
              childItem.children = grandchildren.map((gc) => buildItem(gc))
            }
            return childItem
          })
        }
        return menuItem
      })
      const nav = result.concat(tree)
      markDefaultOpen(nav, currentPath)
      return nav
    }

    return result.concat(chapters.map((ch) => ({
      label: ch.title,
      to: `/course/${cid}/${ch.id}`,
      title: ch.title
    })))
  })

  const accessibleChapterIds = computed(() => {
    const chapters = courseData.value?.chapters || []
    return new Set(chapters.filter(ch => ch.accessible).map(ch => ch.id))
  })

  const passedChapterIds = computed(() => {
    const chapters = courseData.value?.chapters || []
    return new Set(chapters.filter(ch => ch.isPass).map(ch => ch.id))
  })

  return { navigation, courseId, refresh, accessibleChapterIds, passedChapterIds, courseApiUrl }
}

// ====================== Below is the layout shared state (migrated from base) ======================

/**
 * Add index prefix to navigation items: 1, 1.1, 1.1.1 (the first item "Course" does not get an index)
 */
export function indexNavItems(items: NavigationMenuItem[], prefix: string = '', skipFirst: boolean = false): NavigationMenuItem[] {
  return items.map((item, i) => {
    if (skipFirst && i === 0) {
      const newItem: NavigationMenuItem = { ...item }
      if (item.children?.length) {
        newItem.children = indexNavItems(item.children, '', false)
      }
      return newItem
    }
    const num = skipFirst ? i : i + 1
    const idx = prefix ? `${prefix}.${num}` : `${num}`
    const newItem: NavigationMenuItem = {
      ...item,
      label: `${idx} ${item.label}`,
      title: item.label
    }
    if (item.children?.length) {
      newItem.children = indexNavItems(item.children, idx, false)
    }
    return newItem
  })
}

/**
 * Layout shared state: TOC links and layout switches
 */
export function useLayoutState() {
  const route = useRoute()
  const tocLinks = useState<{ id: string; text: string; children?: any[] }[]>('layout-toc', () => [])
  // Current chapter content (tiptap JSON), for ueditor editing in toc.vue
  const chapterContent = useState<any | null>('layout-chapter-content', () => null)
  // Content version number: increment by 1 after saving succeeds, the page watches this value to refresh data
  const contentVersion = useState<number>('layout-content-version', () => 0)
  // Pages can override via setLayout; null means use the route default
  const sidebarOverride = useState<boolean | null>('layout-sidebar-override', () => null)
  const showDanmaku = useState<boolean>('layout-show-danmaku', () => true)
  // Chapter button switch configuration (set by the chapter page from course lmsConfig)
  const chapterBtnsConfig = useState<Record<string, boolean>>('layout-chapter-btns-config', () => ({
    showPlay: true, showScore: true, showSelect: true, showTimer: true,
    showInvite: true, showDanmaku: true, showVote: true, showQuickAnswer: true,
  }))
  // Course button switch configuration (set by the course page from course lmsConfig)
  const courseBtnsConfig = useState<Record<string, boolean>>('layout-course-btns-config', () => ({
    showProgress: true, showLeaderboard: true, showGroups: true,
    showGrades: true, showAnnouncements: true, showWrongBook: true,
  }))
  // Course sidebar navigation version number: increment by 1 when chapter completion status changes, triggers useSidebarNav to re-fetch
  const courseNavVersion = useState<number>('layout-course-nav-version', () => 0)
  // Mobile TOC modal switch (controlled by the main.vue toolbar)
  const mobileTocOpen = useState<boolean>('layout-mobile-toc-open', () => false)

  // Route default: only show aside on chapter pages (/course/:id/:cid)
  // Use computed to directly read the route, ensuring correct values during the SSR render phase
  const isChapterPage = computed(() => /^\/course\/[^/]+\/[^/]+$/.test(route.path))
  const showSidebar = computed(() => sidebarOverride.value ?? isChapterPage.value)

  function setToc(links: { id: string; text: string; children?: any[] }[]) {
    tocLinks.value = links
  }

  function setChapterContent(content: any | null) {
    chapterContent.value = content
  }

  function notifyContentSaved() {
    contentVersion.value++
  }

  /** Notify the course sidebar navigation to refresh (called after chapter is_pass changes) */
  function notifyCourseNavUpdate() {
    courseNavVersion.value++
  }

  function setLayout(opts: { sidebar?: boolean | null }) {
    if (opts.sidebar !== undefined) sidebarOverride.value = opts.sidebar
  }

  // Reset the override on route change, back to the route default (no navigation during SSR, not affected)
  watch(() => route.path, () => {
    sidebarOverride.value = null
  })

  return { tocLinks, chapterContent, contentVersion, showSidebar, showDanmaku, chapterBtnsConfig, courseBtnsConfig, courseNavVersion, mobileTocOpen, setToc, setChapterContent, notifyContentSaved, notifyCourseNavUpdate, setLayout }
}
