/**
 * layout/index.vue component test
 * @see modules/lms/components/layout/index.vue
 *
 * Layout root: LayoutHeader + UMain/UContainer/UPage + LayoutAside + LayoutMain + LayoutFooter.
 * Uses useLayoutState() + useChapterBtns().
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { ref } from 'vue'
import { resetAllStubs, setMockI18n } from '../../../../../test/setup/nuxt-stubs'

beforeEach(() => {
  resetAllStubs()
  setMockI18n({ locale: { value: 'en' }, t: (k: string) => k, d: (v: any) => String(v) })

  // Override useLayoutState stub (nuxt-stubs default only has notifyCourseNavUpdate)
  ;(globalThis as any).useLayoutState = () => ({
    showSidebar: ref(false),
    tocLinks: ref([]),
    chapterContent: ref(null),
    contentVersion: ref(0),
    sidebarOverride: ref(null),
    showDanmaku: ref(true),
    chapterBtnsConfig: ref({}),
    courseBtnsConfig: ref({}),
    courseNavVersion: ref(0),
    mobileTocOpen: ref(false),
    setToc: vi.fn(),
    setChapterContent: vi.fn(),
    notifyContentSaved: vi.fn(),
    notifyCourseNavUpdate: vi.fn(),
    setLayout: vi.fn(),
  })

  // stub useChapterBtns（auto-import）
  ;(globalThis as any).useChapterBtns = () => ({
    playFullscreen: ref(false),
    togglePlay: vi.fn(),
    exitPlay: vi.fn(),
  })
})

const _globalStubs = {
  // LayoutHeader / LayoutMain / LayoutFooter / LayoutAside are auto-import components
  LayoutHeader: { template: '<div class="layout-header" />' },
  LayoutMain: { template: '<div class="layout-main"><slot /></div>' },
  LayoutFooter: { template: '<div class="layout-footer" />' },
  LayoutAside: { template: '<div class="layout-aside" />' },
  UMain: { template: '<div class="umain"><slot /></div>' },
  UContainer: { template: '<div class="ucontainer"><slot /></div>' },
  UPage: { template: '<div class="upage"><slot /><slot name="left" /></div>' },
  UPageAside: { template: '<div class="upage-aside"><slot /></div>' },
}

const _globalConfig = {
  mocks: { $t: (k: string) => k },
  stubs: _globalStubs,
}

describe('layout/index.vue', () => {
  it('渲染布局根', async () => {
    const { default: Layout } = await import('../../../components/layout/index.vue')
    const wrapper = mount(Layout, { global: _globalConfig })
    await flushPromises()
    expect(wrapper.find('.umain').exists()).toBe(true)
  })

  it('playFullscreen=false 时渲染 header', async () => {
    const { default: Layout } = await import('../../../components/layout/index.vue')
    const wrapper = mount(Layout, { global: _globalConfig })
    await flushPromises()
    expect(wrapper.find('.layout-header').exists()).toBe(true)
  })

  it('渲染 main 区域', async () => {
    const { default: Layout } = await import('../../../components/layout/index.vue')
    const wrapper = mount(Layout, {
      global: _globalConfig,
      slots: { default: '<div class="page-content">Content</div>' },
    })
    await flushPromises()
    expect(wrapper.find('.layout-main').exists()).toBe(true)
    expect(wrapper.text()).toContain('Content')
  })

  it('playFullscreen=false 时渲染 footer', async () => {
    const { default: Layout } = await import('../../../components/layout/index.vue')
    const wrapper = mount(Layout, { global: _globalConfig })
    await flushPromises()
    expect(wrapper.find('.layout-footer').exists()).toBe(true)
  })
})
