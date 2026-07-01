import type { NavigationMenuItem } from '@nuxt/ui'
import type {
  LmsHomeData,
  LmsSeries,
  LmsCourseSummary,
  LmsCourseDetail,
  LmsChapterPageData,
} from '#shared/types/lms'

// 类型重导出，供页面使用
export type { LmsSeries, LmsCourseSummary, LmsCourseDetail, LmsChapterPageData, LmsHomeData }

/**
 * 获取首页数据（分类 + 课程列表）
 * 供 header 导航和首页内容使用
 * useFetch 默认 SSR：服务端执行并序列化到客户端
 */
export function useHome() {
  return useFetch<LmsHomeData>('/api/lms/home', {
    transform: (resp: any) => resp?.data ?? { categories: [], courses: [] },
    default: () => ({ categories: [], courses: [] }),
  })
}

/**
 * 顶部导航栏链接（水平菜单）
 * 第一级：课程系列；hover 下拉显示该系列下的课程
 * 数据来自 useHome() —— useFetch 按 URL 去重，不会重复请求
 */
export function useHeaderNav() {
  const { data } = useHome()

  const links = computed<NavigationMenuItem[]>(() => {
    const home = data.value
    const base: NavigationMenuItem = { label: '首页', icon: 'i-lucide-home', to: '/' }
    if (!home || !home.categories.length) return [base]

    return [
      base,
      ...home.categories.map<NavigationMenuItem>((cat) => ({
        label: cat.title,
        icon: cat.icon,
        children: home.courses
          .filter((c) => c.categoryId === cat.id)
          .map((c) => ({
            label: c.title,
            to: `/course/${c.id}`,
            icon: c.icon,
          })),
      })),
    ]
  })

  return { links }
}

/**
 * 左侧边栏导航树（垂直导航菜单）
 * 根据当前路由匹配 /course/:id，自行 useFetch 获取章节列表
 * useFetch 在 SSR 阶段执行且在根 Suspense 下被等待，
 * 因此 aside 首屏即有数据，无需依赖页面通过 useState 间接传递
 * （与课程详情页 useFetch 同 URL 自动去重，不会重复请求）
 */
export function useSidebarNav() {
  const route = useRoute()

  const courseId = computed(() => {
    const match = route.path.match(/^\/course\/([^/]+)/)
    return match?.[1]
  })

  const { data: resp } = useFetch<{ data: { chapters: { id: number; title: string }[] } | null }>(
    () => (courseId.value ? `/api/lms/course/${courseId.value}` : ''),
    { default: () => null }
  )

  const navigation = computed<NavigationMenuItem[]>(() => {
    const cid = courseId.value
    if (!cid) return []
    const chapters = resp.value?.data?.chapters ?? []
    return chapters.map((ch) => ({
      label: ch.title,
      to: `/course/${cid}/${ch.id}`,
    }))
  })

  return { navigation }
}

/**
 * 布局共享状态：目录链接和布局开关
 */
export function useLayoutState() {
  const route = useRoute()
  const tocLinks = useState<{ id: string; text: string; children?: any[] }[]>('layout-toc', () => [])
  // 页面可通过 setLayout 覆盖；null 表示使用路由默认值
  const sidebarOverride = useState<boolean | null>('layout-sidebar-override', () => null)
  const tocOverride = useState<boolean | null>('layout-toc-override', () => null)

  // 路由默认：首页隐藏 aside 和 toc，其他页面显示
  // 使用 computed 直接读取路由，确保 SSR 渲染阶段即可得到正确值
  const showSidebar = computed(() => sidebarOverride.value ?? route.path !== '/')
  const showToc = computed(() => tocOverride.value ?? route.path !== '/')

  function setToc(links: { id: string; text: string; children?: any[] }[]) {
    tocLinks.value = links
  }

  function setLayout(opts: { sidebar?: boolean; toc?: boolean }) {
    if (opts.sidebar !== undefined) sidebarOverride.value = opts.sidebar
    if (opts.toc !== undefined) tocOverride.value = opts.toc
  }

  // 路由变化时重置覆盖，回到路由默认（SSR 阶段无导航，不受影响）
  watch(() => route.path, () => {
    sidebarOverride.value = null
    tocOverride.value = null
  })

  return { tocLinks, showSidebar, showToc, setToc, setLayout }
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
      },
      {
        label: '社区',
        children: [
          { label: 'GitHub', to: 'https://github.com', icon: 'i-lucide-github' },
          { label: 'Discord', to: 'https://discord.com', icon: 'i-lucide-message-circle' },
          { label: 'X (Twitter)', to: 'https://x.com', icon: 'i-lucide-twitter' },
        ],
      },
      {
        label: '关于',
        children: [
          { label: '博客', to: '/blog', icon: 'i-lucide-newspaper' },
          { label: '更新日志', to: '/changelog', icon: 'i-lucide-history' },
          { label: '许可证', to: '/license', icon: 'i-lucide-scale' },
        ],
      },
    ]
  })

  return { links }
}
