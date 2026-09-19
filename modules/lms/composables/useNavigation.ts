import type { NavigationMenuItem } from '@nuxt/ui'
import type { LmsHomeData, LmsCourseDetail } from '#lms/types/lms'

/**
 * 模块级 flag：WS handler 在整个应用生命周期内只注册 1 次
 * 收到 'home-changed' 时调用 refreshNuxtData 触发 useFetch 重新拉取 /api/home
 */
let _wsHandlerRegistered = false

/**
 * 获取首页数据（分类 + 课程列表 + 网站配置 + 未读计数）
 *
 * 单例机制（与 useLmsPublicConfig / useSiteConfig 一致）：
 * - plugins/home-data.ts 在应用启动时调用 useFetch 拉取一次
 * - 数据存入 useState('home-data')，所有组件共享同一份
 * - 客户端 hydration 直接从 payload 还原，不发新请求
 *
 * 实时更新：
 * - WS 广播 'home-changed'（由 categories/courses add|update|batch|delete|import 触发）
 *   → 触发 refreshNuxtData(BOOTSTRAP_KEY)
 *   → useFetch data 更新 → plugin watch 同步到 useState → 所有 computed 自动更新
 *
 * 收益：
 * - 任意组件调用 useHome() 都不会产生新的 useFetch / 新的 network 请求
 * - 所有使用首页数据的组件（useHeaderNav / pages/index.vue / etc.）共享同一份数据
 * - 服务端改导航后所有客户端（包括其他 tab）实时同步
 */
export function useHome() {
  const data = useState<LmsHomeData>('home-data', () => ({
    categories: [],
    courses: [],
    config: null as any,
  }))

  // 客户端：订阅服务端 home-changed 广播，自动 refresh
  if (import.meta.client && !_wsHandlerRegistered) {
    _wsHandlerRegistered = true
    try {
      try { useWsConnection().connect() } catch { /* ignore */ }
      registerWsHandler('home-changed', () => {
        refreshNuxtData(BOOTSTRAP_KEY)
      })
    } catch {
      // WS 模块未启用（base stub 模式），静默忽略
    }
  }

  return {
    data,
    refresh: () => refreshNuxtData(BOOTSTRAP_KEY),
  }
}

/**
 * 顶部导航栏链接（水平菜单）
 * 第一级：课程系列；hover 下拉显示该系列下的课程
 * 数据来自 useHome() —— 通过 useState 共享同一份数据
 */
export function useHeaderNav() {
  const { refresh } = useHome()
  const { categories, getCoursesByCategory } = useHomeCourses()

  const links = computed<NavigationMenuItem[]>(() => {
    if (!categories.value.length) return []

    return categories.value.map<NavigationMenuItem>((cat) => ({
      label: cat.title,
      icon: cat.icon,
      _meta: { type: 'category', id: String(cat.id) },
      children: getCoursesByCategory(cat.id).map((c) => ({
        label: c.title,
        to: `/course/${c.id}`,
        icon: c.icon,
        _meta: { type: 'course', id: String(c.id) },
      })),
    }))
  })

  return { links, refresh }
}

/**
 * 页脚链接
 * 课程系列部分从首页数据动态获取
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
        label: '课程系列',
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

// ====================== 以下为 doc 课程侧边栏导航 ======================

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

  // lms 启用时使用 /api/courses/show（包含 accessible/isPass 字段），
  // 否则使用 doc 的 /api/courses/show
  const courseApiUrl = computed(() => {
    if (!courseId.value) return ''
    const base = moduleLms ? '/api/courses/show' : '/api/courses/show'
    return `${base}?id=${courseId.value}`
  })

  const { data: courseData, refresh } = cRequest.use<LmsCourseDetail | null>(
    () => courseApiUrl.value,
    // 侧边栏导航是课程级数据（不含章节维度），跳过 course_id/chapter_id 自动注入，
    // 避免切章节时 chapter_id 变化导致 URL 变化而重复请求 /api/courses/show
    // keyPrefix：与课程详情页的 /api/courses/show 使用不同 asyncData key，
    // 避免路由切换（章节页→课程页）时侧边栏成员 unmount/abort 让课程详情页读到空数据而误判课程不存在
    { default: () => null, skipInjectIds: true, keyPrefix: 'side:' }
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

// ====================== 以下为布局共享状态（从 base 迁入） ======================

/**
 * 为导航项添加序号前缀：1, 1.1, 1.1.1（第一项"课程"不加序号）
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
 * 布局共享状态：目录链接和布局开关
 */
export function useLayoutState() {
  const route = useRoute()
  const tocLinks = useState<{ id: string; text: string; children?: any[] }[]>('layout-toc', () => [])
  // 当前章节内容（tiptap JSON），供 toc.vue 中的 ueditor 编辑
  const chapterContent = useState<any | null>('layout-chapter-content', () => null)
  // 内容版本号：保存成功后 +1，页面监听此值来刷新数据
  const contentVersion = useState<number>('layout-content-version', () => 0)
  // 页面可通过 setLayout 覆盖；null 表示使用路由默认值
  const sidebarOverride = useState<boolean | null>('layout-sidebar-override', () => null)
  const showDanmaku = useState<boolean>('layout-show-danmaku', () => true)
  // 章节按钮开关配置（由章节页从 course lmsConfig 设置）
  const chapterBtnsConfig = useState<Record<string, boolean>>('layout-chapter-btns-config', () => ({
    showPlay: true, showScore: true, showSelect: true, showTimer: true,
    showInvite: true, showDanmaku: true, showVote: true, showQuickAnswer: true,
  }))
  // 课程按钮开关配置（由课程页从 course lmsConfig 设置）
  const courseBtnsConfig = useState<Record<string, boolean>>('layout-course-btns-config', () => ({
    showProgress: true, showLeaderboard: true, showGroups: true,
    showGrades: true, showAnnouncements: true, showWrongBook: true, showMmo: true,
  }))
  // 课程侧边栏导航版本号：章节完成状态变化时 +1，触发 useSidebarNav 重新拉取
  const courseNavVersion = useState<number>('layout-course-nav-version', () => 0)
  // 移动端 TOC 弹窗开关（由 main.vue 工具栏控制）
  const mobileTocOpen = useState<boolean>('layout-mobile-toc-open', () => false)

  // 路由默认：仅在章节页（/course/:id/:cid）显示 aside
  // 使用 computed 直接读取路由，确保 SSR 渲染阶段即可得到正确值
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

  /** 通知课程侧边栏导航刷新（章节 is_pass 变化后调用） */
  function notifyCourseNavUpdate() {
    courseNavVersion.value++
  }

  function setLayout(opts: { sidebar?: boolean | null }) {
    if (opts.sidebar !== undefined) sidebarOverride.value = opts.sidebar
  }

  // 路由变化时重置覆盖，回到路由默认（SSR 阶段无导航，不受影响）
  watch(() => route.path, () => {
    sidebarOverride.value = null
  })

  return { tocLinks, chapterContent, contentVersion, showSidebar, showDanmaku, chapterBtnsConfig, courseBtnsConfig, courseNavVersion, mobileTocOpen, setToc, setChapterContent, notifyContentSaved, notifyCourseNavUpdate, setLayout }
}
