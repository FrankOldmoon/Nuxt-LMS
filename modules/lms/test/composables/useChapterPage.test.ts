/**
 * useChapterPage composable 测试
 * @see modules/lms/composables/useChapterPage.ts
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import {
  resetAllStubs,
  setMockI18n,
  setMockLayoutState,
  setMockFetchHandler,
  setMockRoute,
} from '../../../../test/setup/nuxt-stubs'
import { ref, computed } from 'vue'

beforeEach(async () => {
  resetAllStubs()
  setMockI18n({ locale: ref('en'), t: (k: string) => k, d: (v: any) => String(v) })
  setMockRoute({ path: '/course/1/2', params: { id: '1', cid: '2' }, query: {} })
  setMockLayoutState({
    setToc: vi.fn(),
    setChapterContent: vi.fn(),
    contentVersion: ref(0),
    notifyCourseNavUpdate: vi.fn(),
  })
  // useChapterPage 依赖 useSidebarNav + extractTocFromContent + indexNavItems
  const { useSidebarNav, indexNavItems } = await import('../../composables/useNavigation')
  ;(globalThis as any).useSidebarNav = () => ({
    navigation: ref([
      { label: 'Home', to: '/course/1' },
      { label: 'Ch1', to: '/course/1/2' },
      { label: 'Ch2', to: '/course/1/3' },
    ]),
    courseId: computed(() => '1'),
    refresh: vi.fn(),
    accessibleChapterIds: computed(() => new Set()),
    passedChapterIds: computed(() => new Set()),
    courseApiUrl: computed(() => '/api/courses/show?id=1'),
  })
  ;(globalThis as any).indexNavItems = indexNavItems
  const { extractTocFromContent } = await import('../../utils/toc')
  ;(globalThis as any).extractTocFromContent = extractTocFromContent
})

describe('composables/useChapterPage', () => {
  it('初始状态：data 默认 null、notFound=false', async () => {
    setMockFetchHandler(async () => ({ data: null, success: true, msg: '' }))
    const { useChapterPage } = await import('../../composables/useChapterPage')
    const r = useChapterPage(computed(() => '2'), computed(() => '1'))
    expect(r.data.value).toBe(null)
    expect(r.notFound.value).toBe(false)
  })

  it('拉取章节成功后设置 data', async () => {
    setMockFetchHandler(async (url) => {
      if (url.includes('/api/chapters/show')) {
        return {
          data: {
            chapter: { id: 2, title: 'Ch1', content: { type: 'doc', content: [] } },
            course: { id: 1, title: 'Course' },
          },
          success: true,
          msg: '',
        }
      }
      return { data: null, success: true, msg: '' }
    })
    const { useChapterPage } = await import('../../composables/useChapterPage')
    const r = useChapterPage(computed(() => '2'), computed(() => '1'))
    await new Promise((resolve) => setTimeout(resolve, 0))
    expect(r.data.value?.chapter?.title).toBe('Ch1')
    expect(r.notFound.value).toBe(false)
  })

  it('请求失败时 notFound=true', async () => {
    setMockFetchHandler(async () => {
      throw new Error('not found')
    })
    const { useChapterPage } = await import('../../composables/useChapterPage')
    const r = useChapterPage(computed(() => '2'), computed(() => '1'))
    await new Promise((resolve) => setTimeout(resolve, 0))
    expect(r.notFound.value).toBe(true)
  })

  it('chapterId 为空时 url 为空字符串', async () => {
    setMockFetchHandler(async () => ({ data: null, success: true, msg: '' }))
    const { useChapterPage } = await import('../../composables/useChapterPage')
    const r = useChapterPage(computed(() => ''), computed(() => '1'))
    await new Promise((resolve) => setTimeout(resolve, 0))
    // url 为空时 data 保持 null
    expect(r.data.value).toBe(null)
  })

  it('flatNav 扁平化导航', async () => {
    setMockFetchHandler(async () => ({ data: null, success: true, msg: '' }))
    const { useChapterPage } = await import('../../composables/useChapterPage')
    const r = useChapterPage(computed(() => '2'), computed(() => '1'))
    expect(r.flatNav.value.length).toBe(3)
    expect(r.flatNav.value[1]?.to).toBe('/course/1/2')
  })

  it('currentNavIndex 计算当前章节索引', async () => {
    setMockFetchHandler(async () => ({ data: null, success: true, msg: '' }))
    const { useChapterPage } = await import('../../composables/useChapterPage')
    const r = useChapterPage(computed(() => '2'), computed(() => '1'))
    expect(r.currentNavIndex.value).toBe(1)
  })

  it('prevChapter 返回上一章节', async () => {
    setMockFetchHandler(async () => ({ data: null, success: true, msg: '' }))
    const { useChapterPage } = await import('../../composables/useChapterPage')
    const r = useChapterPage(computed(() => '2'), computed(() => '1'))
    expect(r.prevChapter.value?.to).toBe('/course/1')
  })

  it('nextChapter 返回下一章节', async () => {
    setMockFetchHandler(async () => ({ data: null, success: true, msg: '' }))
    const { useChapterPage } = await import('../../composables/useChapterPage')
    const r = useChapterPage(computed(() => '2'), computed(() => '1'))
    expect(r.nextChapter.value?.to).toBe('/course/1/3')
  })

  it('最后一个章节 nextChapter=null', async () => {
    setMockFetchHandler(async () => ({ data: null, success: true, msg: '' }))
    const { useChapterPage } = await import('../../composables/useChapterPage')
    const r = useChapterPage(computed(() => '3'), computed(() => '1'))
    expect(r.nextChapter.value).toBe(null)
  })

  it('第一个章节 prevChapter=null', async () => {
    setMockFetchHandler(async () => ({ data: null, success: true, msg: '' }))
    const { useChapterPage } = await import('../../composables/useChapterPage')
    const r = useChapterPage(computed(() => '1'), computed(() => '1'))
    // /course/1 是 Home (索引 0)，匹配的 to 是 /course/1 → 不在章节列表（chapterId='1' 但实际 route 是 /course/1/1）
    // flatNav 索引 0 是 Home (/course/1)，chapterId=1 → to=/course/1/1 不在 flatNav
    expect(r.currentNavIndex.value).toBe(-1)
    expect(r.prevChapter.value).toBe(null)
  })
})
