import type { NavigationMenuItem } from '@nuxt/ui'
import type {
  LmsHomeData,
  LmsSeries,
  LmsCourseSummary,
  LmsCourseDetail,
  LmsChapterSummary,
  LmsChapterPageData,
} from '#shared/types/lms'

// 类型重导出，供页面使用
export type { LmsSeries, LmsCourseSummary, LmsCourseDetail, LmsChapterSummary, LmsChapterPageData, LmsHomeData }

/**
 * 获取首页数据（分类 + 课程列表）
 * 供 header 导航和首页内容使用
 * useFetch 默认 SSR：服务端执行并序列化到客户端
 */
export function useHome() {
  return cRequest.use<LmsHomeData>('/api/lms/home', {
    default: () => ({ categories: [], courses: [] }),
  })
}

/**
 * 顶部导航栏链接（水平菜单）
 * 第一级：课程系列；hover 下拉显示该系列下的课程
 * 数据来自 useHome() —— useFetch 按 URL 去重，不会重复请求
 */
export function useHeaderNav() {
  const { data, refresh } = useHome()

  const links = computed<NavigationMenuItem[]>(() => {
    const home = data.value
    const base: NavigationMenuItem = { label: '首页', icon: 'i-lucide-home', to: '/' }
    if (!home || !home.categories.length) return [base]

    return [
      base,
      ...home.categories.map<NavigationMenuItem>((cat) => {
        const catCourses = home.courses.filter((c) => c.categoryId === cat.id)
        let orderedCourses = catCourses

        // 如果分类有 orders 配置，按 orders 中的 order 排序显示
        if (cat.orders && cat.orders.length > 0) {
          const courseMap = new Map(catCourses.map((c) => [String(c.id), c]))
          const sorted = [...cat.orders].sort((a, b) => a.order - b.order)
          orderedCourses = sorted
            .filter((o) => courseMap.has(o.id))
            .map((o) => courseMap.get(o.id)!)
        }

        return {
          label: cat.title,
          icon: cat.icon,
          _meta: { type: 'category', id: String(cat.id) },
          children: orderedCourses.map((c) => ({
            label: c.title,
            to: `/course/${c.id}`,
            icon: c.icon,
            _meta: { type: 'course', id: String(c.id) },
          })),
        }
      }),
    ]
  })

  return { links, refresh }
}

/**
 * 左侧边栏导航树（垂直导航菜单）
 * 根据当前路由匹配 /course/:id，自行 useFetch 获取章节列表
 * 优先使用 courses 表的 orders 字段（自定义排序），否则使用默认章节顺序
 * useFetch 在 SSR 阶段执行且在根 Suspense 下被等待，
 * 因此 aside 首屏即有数据，无需依赖页面通过 useState 间接传递
 * （与课程详情页 useFetch 同 URL 自动去重，不会重复请求）
 */
export function useSidebarNav() {
  const route = useRoute()

  const courseId = computed(() => {
    const match = route.path.match(/^\/course\/([^/]+)/)
    return match?.[1] ?? ''
  })

  // 获取课程详情（包含 orders 字段）
  const { data: courseData, refresh } = cRequest.use<LmsCourseDetail | null>(
    () => courseId.value ? `/api/lms/courses/show?id=${courseId.value}` : '',
    { default: () => null }
  )

  // 构建导航数据：优先使用 orders，否则使用默认章节顺序
  const navigation = computed<NavigationMenuItem[]>(() => {
    const cid = courseId.value
    if (!cid) return []

    const course = courseData.value
    if (!course) return []

    const orders = course.orders ?? []
    const chapters = course.chapters ?? []
    const result: NavigationMenuItem[] = [{ label: '课程', to: `/course/${cid}` }]
    // 如果有自定义 orders，使用 orders 构建导航（支持嵌套层级）
    if (orders.length > 0) {
      const sorted = [...orders].sort((a, b) => a.order - b.order)

      // 构建单条导航项
      function buildItem(item: typeof sorted[number]): NavigationMenuItem {
        const base: NavigationMenuItem = { label: item.label }

        // 如果是章节（id 是数字），构建章节链接
        if (item.id && !item.id.startsWith('custom-') && !isNaN(Number(item.id))) {
          base.to = `/course/${cid}/${item.id}`
        } else if (item.id === 'course') {
          base.to = `/course/${cid}`
        } else {
          base.to = `/course/${cid}#${item.label}`
        }

        return base
      }

      // 构建树形结构：parentId 为 null/undefined 的是根节点
      const rootItems = sorted.filter((item) => !item.parentId)
      const tree: NavigationMenuItem[] = rootItems.map((root) => {
        const menuItem = buildItem(root)
        // 查找子节点
        const children = sorted.filter((child) => child.parentId === root.id)
        if (children.length > 0) {
          menuItem.children = children.map((child) => {
            const childItem = buildItem(child)
            // 查找三级子节点
            const grandchildren = sorted.filter((gc) => gc.parentId === child.id)
            if (grandchildren.length > 0) {
              childItem.children = grandchildren.map((gc) => buildItem(gc))
            }
            return childItem
          })
        }
        return menuItem
      })
      return result.concat(tree)
    }

    // 默认：课程首页 + 章节列表

    return result.concat(chapters.map((ch) => ({
      label: ch.title,
      to: `/course/${cid}/${ch.id}`,
    })))
  })

  return { navigation, courseId, refresh }
}

/**
 * 布局共享状态：目录链接和布局开关
 */
export function useLayoutState() {
  const route = useRoute()
  const tocLinks = useState<{ id: string; text: string; children?: any[] }[]>('layout-toc', () => [])
  // 当前页面可编辑的内容（tiptap JSON），供 toc.vue 中的 ueditor 编辑
  const editableContent = useState<any | null>('layout-editable-content', () => null)
  // 可编辑内容对应的表名和记录标识（DB name 列），供保存时调用 update API
  const editableTable = useState<string>('layout-editable-table', () => '')
  const editableId = useState<number>('layout-editable-id', () => 0)
  // 可编辑内容所属的课程 ID（章节编辑时需要此信息来判断编辑权限）
  const editableCourseId = useState<number>('layout-editable-course-id', () => 0)
  // 内容版本号：保存成功后 +1，页面监听此值来刷新数据
  const contentVersion = useState<number>('layout-content-version', () => 0)
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

  function setEditableContent(content: any | null) {
    editableContent.value = content
  }

  function setEditableMeta(table: string, id: number, courseId?: number) {
    editableTable.value = table
    editableId.value = id
    if (courseId !== undefined) {
      editableCourseId.value = courseId
    }
  }

  function notifyContentSaved() {
    contentVersion.value++
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

  return { tocLinks, editableContent, editableTable, editableId, editableCourseId, contentVersion, showSidebar, showToc, setToc, setEditableContent, setEditableMeta, notifyContentSaved, setLayout }
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

/**
 * 课程详情页数据获取
 * 从当前路由自己读取 courseId，SSR 阶段即可完成数据获取 + TOC 设置
 * 内置 TOC 提取、可编辑内容设置、保存后自动刷新
 * 可在 layout 和 page 中同时调用，useFetch 自动去重
 */
export function useCourseDetail() {
  const route = useRoute()
  const courseId = computed(() => route.params.id as string)

  // 布局共享状态（必须在 useFetch 之前调用）
  const { setToc, setEditableContent, setEditableMeta, contentVersion } = useLayoutState()

  const { data: resp, pending, refresh } = cRequest.use<LmsCourseDetail | null>(
    () => `/api/lms/courses/show?id=${courseId.value}`,
    {
      default: () => null,
    }
  )

  const course = computed(() => resp.value as LmsCourseDetail | null)

  // 数据变化时设置 TOC + 可编辑内容（首次获取 + 缓存命中都会触发）
  watch(resp, (detail) => {
    // 跳过初始的 null/undefined，等实际数据到达后再处理
    if (!detail) return

    const content = detail?.content

    if (!content) {
      setToc([{ id: 'chapters', text: '课程章节' }])
    } else {
      setToc([...extractTocFromContent(content), { id: 'chapters', text: '课程章节' }])
    }
    setEditableContent(content ?? null)
    console.log('content', content)
    if (detail?.id) setEditableMeta('courses', detail.id, detail.id)
  }, { immediate: true })

  // 监听内容版本号，保存成功后重新获取数据
  watch(contentVersion, () => refresh())

  return { course, pending, refresh }
}

/**
 * 章节页面数据获取
 * 从当前路由自己读取 chapterId，SSR 阶段即可完成数据获取 + TOC 设置
 * 内置 TOC 提取、可编辑内容设置、上下章导航、保存后自动刷新
 * 可在 layout 和 page 中同时调用，useFetch 自动去重
 */
export function useChapterPageData() {
  const route = useRoute()
  const chapterId = computed(() => route.params.cid as string)

  // 布局共享状态（必须在 useFetch 之前调用）
  const { setToc, setEditableContent, setEditableMeta, contentVersion } = useLayoutState()

  const { data: resp, pending, refresh } = cRequest.use<LmsChapterPageData | null>(
    () => chapterId.value ? `/api/lms/chapters/show?id=${chapterId.value}` : '',
    {
      default: () => null,
    }
  )

  const data = computed(() => resp.value as LmsChapterPageData | null)

  // 数据变化时设置 TOC + 可编辑内容（首次获取 + 缓存命中都会触发）
  watch(resp, (d) => {
    // 跳过初始的 null/undefined，等实际数据到达后再处理
    if (!d) return

    setToc(extractTocFromContent(d?.chapter?.content))
    setEditableContent(d?.chapter?.content ?? null)
    if (d?.chapter?.id) setEditableMeta('chapters', d.chapter.id, d.course.id)
  }, { immediate: true })

  // 监听内容版本号，保存成功后重新获取数据
  watch(contentVersion, () => refresh())

  const prevChapter = computed(() => {
    const d = data.value
    if (!d) return null
    const chapters = d.course.chapters
    const idx = chapters.findIndex((ch) => ch.id === d.chapter.id)
    return idx > 0 ? chapters[idx - 1]! : null
  })

  const nextChapter = computed(() => {
    const d = data.value
    if (!d) return null
    const chapters = d.course.chapters
    const idx = chapters.findIndex((ch) => ch.id === d.chapter.id)
    return idx < chapters.length - 1 ? chapters[idx + 1]! : null
  })

  return { data, pending, refresh, prevChapter, nextChapter }
}
