import type { ComputedRef } from 'vue'

/**
 * Chapter page shared logic (common for doc / lms)
 *
 * Extracted from pages/course/[id]/[cid].vue to eliminate duplicate script changes between doc and lms.
 * Both doc and lms use /api/chapters/show, no need to parameterize the API URL.
 *
 * lms can extend the returned values with locked status, setupChapterTask,
 * button configuration, task status initialization, etc.
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

  // Set TOC + chapter content when data changes
  // flush: 'sync' ensures synchronous execution during SSR Suspense recovery
  watch(resp, (d) => {
    if (!d) return
    const links = extractTocFromContent(d?.chapter?.content)
    // Use the chapter title (h1) as the TOC root node, with content headings as children, reflecting h1 > h2 > h3 hierarchy
    if (d?.chapter?.title) {
      setToc([{ id: chapterId.value, text: d.chapter.title, children: links }])
    } else {
      setToc(links)
    }
    setChapterContent(d?.chapter?.content ?? null)
  }, { immediate: true, flush: 'sync' })

  // Refetch data after content is saved successfully
  // Clear useFetch's payload/static cache (getCachedData would fall back to these caches and return stale data),
  // after clearing with the exact key, refresh() will definitely re-request from the server
  watch(contentVersion, () => {
    const nuxtApp = useNuxtApp()
    const key = `/api/chapters/show?id=${chapterId.value}`
    delete nuxtApp.payload.data[key]
    if (nuxtApp.static?.data) delete nuxtApp.static.data[key]
    refresh()
  }, { flush: 'sync' })

  // Flatten sidebar navigation to get a linear list sorted by orders (with index prefix)
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

  // Index of the current chapter in the navigation
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
