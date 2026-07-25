import type { ComputedRef } from 'vue'

/**
 * 章节页共享逻辑（doc / lms 通用）
 *
 * 提取自 pages/course/[id]/[cid].vue，消除 doc 与 lms 之间的 script 双改。
 * doc 和 lms 都用 /api/chapters/show，API URL 无需参数化。
 *
 * lms 可在返回值基础上扩展 locked 状态、setupChapterTask、
 * 按钮配置、任务状态初始化等。
 */
export function useChapterPage(chapterId: ComputedRef<string>, courseId: ComputedRef<string>) {
  const { setToc, setChapterContent, contentVersion } = useLayoutState()
  const { navigation } = useSidebarNav()

  const { data: resp, pending, refresh, error } = cRequest.use<import('#lms/types/lms').LmsChapterPageData | null>(
    () => chapterId.value ? `/api/chapters/show?id=${chapterId.value}` : '',
    { default: () => null },
  )

  const data = computed(() => resp.value as import('#lms/types/lms').LmsChapterPageData | null)

  const notFound = computed(() => !!error.value)

  // 数据变化时设置 TOC + 章节内容
  // flush: 'sync' 确保在 SSR Suspense 恢复时同步执行
  watch(resp, (d) => {
    if (!d) return
    const links = extractTocFromContent(d?.chapter?.content)
    // 将章节标题（h1）作为 TOC 根节点，内容 heading 作为其子级，体现 h1 > h2 > h3 层级
    if (d?.chapter?.title) {
      setToc([{ id: chapterId.value, text: d.chapter.title, children: links }])
    } else {
      setToc(links)
    }
    setChapterContent(d?.chapter?.content ?? null)
  }, { immediate: true, flush: 'sync' })

  // 内容保存成功后重新获取数据
  // 清除 useFetch 的 payload/static 缓存（getCachedData 会回退到这些缓存返回旧数据），
  // 用精确 key 清除后 refresh() 必然重新请求服务端
  watch(contentVersion, () => {
    const nuxtApp = useNuxtApp()
    const key = `/api/chapters/show?id=${chapterId.value}`
    delete nuxtApp.payload.data[key]
    if (nuxtApp.static?.data) delete nuxtApp.static.data[key]
    refresh()
  }, { flush: 'sync' })

  // 扁平化侧边栏导航，得到按 orders 排序的线性列表（带序号前缀）
  const flatNav = computed(() => {
    const result: { label: string; to: string }[] = []
    function walk(items: any[]) {
      for (const item of items) {
        if (item.to) result.push({ label: item.label, to: item.to })
        if (item.children) walk(item.children)
      }
    }
    walk(indexNavItems(navigation.value, '', true))
    return result
  })

  // 当前章节在导航中的索引
  const currentNavIndex = computed(() =>
    flatNav.value.findIndex((item) => item.to === `/course/${courseId.value}/${chapterId.value}`),
  )

  const prevChapter = computed(() => {
    const idx = currentNavIndex.value
    return idx > 0 ? flatNav.value[idx - 1]! : null
  })

  const nextChapter = computed(() => {
    const idx = currentNavIndex.value
    return idx >= 0 && idx < flatNav.value.length - 1 ? flatNav.value[idx + 1]! : null
  })

  return {
    resp, pending, refresh, error, data, notFound,
    flatNav, currentNavIndex, prevChapter, nextChapter,
  }
}
