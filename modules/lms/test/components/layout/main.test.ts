/**
 * layout/main.vue 组件测试
 * @see modules/lms/components/layout/main.vue
 *
 * 主内容区：包裹 BaseMain，注入移动端工具栏 + slot 内容。
 * 使用 useLayoutState() + useChapterBtns() + useRoute()。
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { ref } from 'vue'
import { resetAllStubs, setMockI18n, setMockRoute } from '../../../../../test/setup/nuxt-stubs'

beforeEach(() => {
  resetAllStubs()
  setMockI18n({ locale: { value: 'en' }, t: (k: string) => k, d: (v: any) => String(v) })
  setMockRoute({ params: {}, query: {}, path: '/', fullPath: '/' })

  // 覆盖 useLayoutState stub
  ;(globalThis as any).useLayoutState = () => ({
    showSidebar: ref(false),
    mobileTocOpen: ref(false),
    tocLinks: ref([]),
    chapterContent: ref(null),
    contentVersion: ref(0),
    sidebarOverride: ref(null),
    showDanmaku: ref(true),
    chapterBtnsConfig: ref({}),
    courseBtnsConfig: ref({}),
    courseNavVersion: ref(0),
    setToc: vi.fn(),
    setChapterContent: vi.fn(),
    notifyContentSaved: vi.fn(),
    notifyCourseNavUpdate: vi.fn(),
    setLayout: vi.fn(),
  })

  // stub useChapterBtns
  ;(globalThis as any).useChapterBtns = () => ({
    playFullscreen: ref(false),
    togglePlay: vi.fn(),
    exitPlay: vi.fn(),
  })
})

const _globalStubs = {
  BaseMain: { template: '<div class="base-main"><slot /></div>' },
  UButton: { template: '<button @click="$emit(\'click\')">{{ label }}<slot /></button>', props: ['icon', 'color', 'variant', 'label'] },
  USlideover: {
    template: '<div v-if="open" class="slideover"><slot name="body" /></div>',
    props: ['open', 'title', 'side'],
  },
  LayoutAside: { template: '<div class="layout-aside" />' },
  LayoutToc: { template: '<div class="layout-toc" />' },
}

const _globalConfig = {
  mocks: { $t: (k: string) => k },
  stubs: _globalStubs,
}

describe('layout/main.vue', () => {
  it('渲染 BaseMain', async () => {
    const { default: Main } = await import('../../../components/layout/main.vue')
    const wrapper = mount(Main, { global: _globalConfig })
    await flushPromises()
    expect(wrapper.find('.base-main').exists()).toBe(true)
  })

  it('渲染 slot 内容', async () => {
    const { default: Main } = await import('../../../components/layout/main.vue')
    const wrapper = mount(Main, {
      global: _globalConfig,
      slots: { default: '<div class="content">Hello</div>' },
    })
    await flushPromises()
    expect(wrapper.text()).toContain('Hello')
  })

  it('showSidebar=false 时不渲染移动端工具栏', async () => {
    const { default: Main } = await import('../../../components/layout/main.vue')
    const wrapper = mount(Main, { global: _globalConfig })
    await flushPromises()
    expect(wrapper.text()).not.toContain('layout.menu')
  })

  it('showSidebar=true 时渲染移动端工具栏', async () => {
    ;(globalThis as any).useLayoutState = () => ({
      showSidebar: ref(true),
      mobileTocOpen: ref(false),
      tocLinks: ref([]),
      chapterContent: ref(null),
      contentVersion: ref(0),
      sidebarOverride: ref(null),
      showDanmaku: ref(true),
      chapterBtnsConfig: ref({}),
      courseBtnsConfig: ref({}),
      courseNavVersion: ref(0),
      setToc: vi.fn(),
      setChapterContent: vi.fn(),
      notifyContentSaved: vi.fn(),
      notifyCourseNavUpdate: vi.fn(),
      setLayout: vi.fn(),
    })
    const { default: Main } = await import('../../../components/layout/main.vue')
    const wrapper = mount(Main, { global: _globalConfig })
    await flushPromises()
    expect(wrapper.text()).toContain('layout.menu')
    expect(wrapper.text()).toContain('layout.toc')
  })
})
