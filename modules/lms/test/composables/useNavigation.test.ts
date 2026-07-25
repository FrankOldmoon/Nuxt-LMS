/**
 * useNavigation composable 测试（useHome / useHeaderNav / useFooterNav / useSidebarNav / useLayoutState / indexNavItems）
 * @see modules/lms/composables/useNavigation.ts
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { ref, computed } from 'vue'
import { flushPromises } from '@vue/test-utils'
import {
  resetAllStubs,
  setMockI18n,
  setMockRoute,
  setMockRuntimeConfig,
  setMockFetchHandler,
} from '../../../../test/setup/nuxt-stubs'

beforeEach(() => {
  resetAllStubs()
  setMockI18n({ locale: ref('en'), t: (k: string) => k, d: (v: any) => String(v) })
})

describe('composables/useNavigation - useHome', () => {
  it('返回默认数据结构', async () => {
    const { useHome } = await import('../../composables/useNavigation')
    const { data } = useHome()
    expect(data.value.categories).toEqual([])
    expect(data.value.courses).toEqual([])
    expect(data.value.config).toBeNull()
    expect(data.value.notifyUnread).toBe(0)
    expect(data.value.msgUnread).toBe(0)
  })

  it('refresh 不抛错', async () => {
    const { useHome } = await import('../../composables/useNavigation')
    const { refresh } = useHome()
    await expect(refresh()).resolves.toBeUndefined()
  })
})

describe('composables/useNavigation - useHeaderNav', () => {
  it('无分类时返回 base Home 链接', async () => {
    // stub useHomeCourses（auto-imported）
    ;(globalThis as any).useHomeCourses = () => ({
      categories: computed(() => []),
      getCoursesByCategory: () => [],
    })
    const { useHeaderNav } = await import('../../composables/useNavigation')
    const { links } = useHeaderNav()
    expect(links.value).toHaveLength(1)
    expect(links.value[0].label).toBe('Home')
  })

  it('有分类时返回分类+课程链接', async () => {
    ;(globalThis as any).useHomeCourses = () => ({
      categories: computed(() => [
        { id: 1, title: 'Cat A', icon: 'i-a' },
      ]),
      getCoursesByCategory: () => [
        { id: 10, title: 'Course 1', icon: 'i-c' },
      ],
    })
    const { useHeaderNav } = await import('../../composables/useNavigation')
    const { links } = useHeaderNav()
    expect(links.value).toHaveLength(2)
    expect(links.value[1].label).toBe('Cat A')
    expect(links.value[1].children).toHaveLength(1)
    expect(links.value[1].children[0].to).toBe('/course/10')
  })
})

describe('composables/useNavigation - useFooterNav', () => {
  it('返回课程系列页脚链接', async () => {
    const { useHome, useFooterNav } = await import('../../composables/useNavigation')
    const { data } = useHome()
    data.value.categories = [
      { id: 1, title: 'Series A', icon: 'i-a' },
      { id: 2, title: 'Series B', icon: 'i-b' },
    ]
    const { links } = useFooterNav()
    expect(links.value).toHaveLength(1)
    expect(links.value[0].label).toBe('课程系列')
    expect(links.value[0].children).toHaveLength(2)
    expect(links.value[0].children[0].to).toBe('/?category=1#1')
  })
})

describe('composables/useNavigation - useSidebarNav', () => {
  it('无 courseId 时返回空导航', async () => {
    setMockRoute({ params: {}, query: {}, path: '/', fullPath: '/' })
    setMockRuntimeConfig({ public: { moduleBase: true, moduleLms: true } })
    setMockFetchHandler(async () => ({ data: null, success: true, msg: '' }))
    const { useSidebarNav } = await import('../../composables/useNavigation')
    const { navigation, courseId } = useSidebarNav()
    expect(courseId.value).toBe('')
    expect(navigation.value).toEqual([])
  })

  it('有 courseId 时从 API 数据构建导航', async () => {
    setMockRoute({ params: { id: '42' }, query: {}, path: '/course/42', fullPath: '/course/42' })
    setMockRuntimeConfig({ public: { moduleBase: true, moduleLms: true } })
    setMockFetchHandler(async (url) => {
      if (url.includes('/api/courses/show')) {
        return {
          data: {
            id: 42,
            title: 'Test Course',
            chapters: [{ id: 1, title: 'Ch1', accessible: true, isOpen: true, isPass: false }],
            orders: [],
          },
          success: true,
          msg: '',
        }
      }
      return { data: null, success: true, msg: '' }
    })
    const { useSidebarNav } = await import('../../composables/useNavigation')
    const { navigation, courseId, accessibleChapterIds, passedChapterIds } = useSidebarNav()
    expect(courseId.value).toBe('42')
    // 等待 cRequest.use 的异步 fetch 完成
    await vi.waitFor(() => {
      expect(navigation.value.length).toBeGreaterThanOrEqual(1)
    })
    expect(accessibleChapterIds.value.has(1)).toBe(true)
    expect(passedChapterIds.value.has(1)).toBe(false)
  })
})

describe('composables/useNavigation - useLayoutState', () => {
  it('返回初始布局状态', async () => {
    setMockRoute({ params: {}, query: {}, path: '/', fullPath: '/' })
    const { useLayoutState } = await import('../../composables/useNavigation')
    const state = useLayoutState()
    expect(state.tocLinks.value).toEqual([])
    expect(state.chapterContent.value).toBeNull()
    expect(state.contentVersion.value).toBe(0)
    expect(state.showSidebar.value).toBe(false)
    expect(state.showDanmaku.value).toBe(true)
    expect(state.chapterBtnsConfig.value.showPlay).toBe(true)
    expect(state.courseBtnsConfig.value.showProgress).toBe(true)
    expect(state.courseNavVersion.value).toBe(0)
    expect(state.mobileTocOpen.value).toBe(false)
  })

  it('setToc 设置 tocLinks', async () => {
    setMockRoute({ params: {}, query: {}, path: '/', fullPath: '/' })
    const { useLayoutState } = await import('../../composables/useNavigation')
    const { setToc, tocLinks } = useLayoutState()
    setToc([{ id: 'h1', text: 'Heading 1' }])
    expect(tocLinks.value).toHaveLength(1)
    expect(tocLinks.value[0].text).toBe('Heading 1')
  })

  it('notifyContentSaved 自增 contentVersion', async () => {
    setMockRoute({ params: {}, query: {}, path: '/', fullPath: '/' })
    const { useLayoutState } = await import('../../composables/useNavigation')
    const { notifyContentSaved, contentVersion } = useLayoutState()
    expect(contentVersion.value).toBe(0)
    notifyContentSaved()
    expect(contentVersion.value).toBe(1)
    notifyContentSaved()
    expect(contentVersion.value).toBe(2)
  })

  it('notifyCourseNavUpdate 自增 courseNavVersion', async () => {
    setMockRoute({ params: {}, query: {}, path: '/', fullPath: '/' })
    const { useLayoutState } = await import('../../composables/useNavigation')
    const { notifyCourseNavUpdate, courseNavVersion } = useLayoutState()
    expect(courseNavVersion.value).toBe(0)
    notifyCourseNavUpdate()
    expect(courseNavVersion.value).toBe(1)
  })

  it('setLayout 覆盖 sidebar', async () => {
    setMockRoute({ params: {}, query: {}, path: '/', fullPath: '/' })
    const { useLayoutState } = await import('../../composables/useNavigation')
    const { setLayout, showSidebar } = useLayoutState()
    expect(showSidebar.value).toBe(false)
    setLayout({ sidebar: true })
    expect(showSidebar.value).toBe(true)
    setLayout({ sidebar: null })
    expect(showSidebar.value).toBe(false)
  })

  it('章节页路由时 showSidebar 默认为 true', async () => {
    setMockRoute({ params: { id: '1', cid: '2' }, query: {}, path: '/course/1/2', fullPath: '/course/1/2' })
    const { useLayoutState } = await import('../../composables/useNavigation')
    const { showSidebar } = useLayoutState()
    expect(showSidebar.value).toBe(true)
  })
})

describe('composables/useNavigation - indexNavItems', () => {
  it('添加序号前缀', async () => {
    const { indexNavItems } = await import('../../composables/useNavigation')
    const items = [
      { label: 'A', children: [{ label: 'A1' }, { label: 'A2' }] },
      { label: 'B' },
    ]
    const result = indexNavItems(items)
    expect(result[0].label).toBe('1 A')
    expect(result[0].children[0].label).toBe('1.1 A1')
    expect(result[0].children[1].label).toBe('1.2 A2')
    expect(result[1].label).toBe('2 B')
  })

  it('skipFirst 时第一项不加序号', async () => {
    const { indexNavItems } = await import('../../composables/useNavigation')
    const items = [
      { label: 'Home' },
      { label: 'A', children: [{ label: 'A1' }] },
    ]
    const result = indexNavItems(items, '', true)
    expect(result[0].label).toBe('Home')
    expect(result[1].label).toBe('1 A')
    expect(result[1].children[0].label).toBe('1.1 A1')
  })
})
