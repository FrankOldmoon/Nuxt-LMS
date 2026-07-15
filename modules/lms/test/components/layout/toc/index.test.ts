/**
 * layout/toc/index.vue component test
 * @see modules/lms/components/layout/toc/index.vue
 *
 * TOC area: play button + download menu + ChapterBtns + ClassUserCard + learning progress + TOC list.
 * Uses useToc() (from ./useToc.ts), internally depends on useAuth/useAuthLms/useLayoutState/useLmsContext/useChapterBtns/useChapterTask/useLmsPublicConfig.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { ref, computed } from 'vue'
import { resetAllStubs, setMockI18n, setMockAuthUser } from '../../../../../../test/setup/nuxt-stubs'

beforeEach(() => {
  resetAllStubs()
  setMockI18n({ locale: { value: 'en' }, t: (k: string) => k, d: (v: any) => String(v) })

  // stub useAuthLms
  ;(globalThis as any).useAuthLms = () => ({
    user: ref(null),
    roles: ref([]),
    permissions: ref([]),
    editorCourseIds: ref([]),
    teacherCourseIds: ref([]),
    isCourseEditor: () => false,
    isCourseTeacher: () => false,
    login: vi.fn(),
    register: vi.fn(),
    logout: vi.fn(),
    refreshUser: vi.fn(),
  })

  // Override useLayoutState stub
  ;(globalThis as any).useLayoutState = () => ({
    tocLinks: ref([{ id: 'h1', text: 'Heading 1' }]),
    chapterContent: ref(null),
    notifyContentSaved: vi.fn(),
    chapterBtnsConfig: ref({ showPlay: true, showScore: true, showSelect: true, showTimer: true, showInvite: true, showDanmaku: true, showVote: true, showQuickAnswer: true }),
    courseNavVersion: ref(0),
    showSidebar: ref(false),
    mobileTocOpen: ref(false),
    contentVersion: ref(0),
    sidebarOverride: ref(null),
    showDanmaku: ref(true),
    courseBtnsConfig: ref({}),
    setToc: vi.fn(),
    setChapterContent: vi.fn(),
    notifyCourseNavUpdate: vi.fn(),
    setLayout: vi.fn(),
  })

  // stub useChapterBtns
  ;(globalThis as any).useChapterBtns = () => ({
    playFullscreen: ref(false),
    togglePlay: vi.fn(),
    exitPlay: vi.fn(),
  })

  // stub useLmsPublicConfig（auto-import）
  ;(globalThis as any).useLmsPublicConfig = () => ({
    chapterPage: { enableFullscreen: true },
  })

  // stub useChapterTask (auto-import) — returns null
  ;(globalThis as any).useChapterTask = () => null
})

const _globalStubs = {
  UButton: { template: '<button :loading="loading" :disabled="disabled" @click="$emit(\'click\')">{{ label }}<slot /></button>', props: ['label', 'icon', 'color', 'variant', 'size', 'loading', 'disabled'] },
  UDropdownMenu: { template: '<div class="dropdown"><slot /></div>', props: ['items'] },
  UProgress: { template: '<div class="progress" />', props: ['modelValue'] },
  UModal: { template: '<div v-if="open" class="modal"><slot /><slot name="body" /><slot name="footer" /></div>', props: ['open', 'fullscreen', 'scrollable'] },
  ChapterBtns: { template: '<div class="chapter-btns" />' },
  ClassUserCard: { template: '<div class="class-user-card" />' },
  ChapterHistoryModal: { template: '<div class="chapter-history" />', props: ['table', 'id'] },
  LayoutTocList: { template: '<div class="toc-list" />', props: ['links', 'class'] },
  ueditor: { template: '<div class="ueditor" />', props: ['modelValue', 'saveHandler', 'lockId', 'showInsert'] },
}

const _globalConfig = {
  mocks: { $t: (k: string) => k },
  stubs: _globalStubs,
}

describe('layout/toc/index.vue', () => {
  it('渲染 TOC 区域', async () => {
    setMockAuthUser({ id: 1, name: 'Alice' })
    const { default: Toc } = await import('../../../../components/layout/toc/index.vue')
    const wrapper = mount(Toc, { global: _globalConfig })
    await flushPromises()
    expect(wrapper.exists()).toBe(true)
  })

  it('渲染下载按钮', async () => {
    setMockAuthUser({ id: 1, name: 'Alice' })
    const { default: Toc } = await import('../../../../components/layout/toc/index.vue')
    const wrapper = mount(Toc, { global: _globalConfig })
    await flushPromises()
    expect(wrapper.text()).toContain('chapter.download')
  })

  it('渲染 ChapterBtns 和 ClassUserCard', async () => {
    setMockAuthUser({ id: 1, name: 'Alice' })
    const { default: Toc } = await import('../../../../components/layout/toc/index.vue')
    const wrapper = mount(Toc, { global: _globalConfig })
    await flushPromises()
    expect(wrapper.find('.chapter-btns').exists()).toBe(true)
    expect(wrapper.find('.class-user-card').exists()).toBe(true)
  })

  it('渲染 LayoutTocList', async () => {
    setMockAuthUser({ id: 1, name: 'Alice' })
    const { default: Toc } = await import('../../../../components/layout/toc/index.vue')
    const wrapper = mount(Toc, { global: _globalConfig })
    await flushPromises()
    expect(wrapper.find('.toc-list').exists()).toBe(true)
  })

  it('enableFullscreen=true 时显示播放按钮', async () => {
    setMockAuthUser({ id: 1, name: 'Alice' })
    const { default: Toc } = await import('../../../../components/layout/toc/index.vue')
    const wrapper = mount(Toc, { global: _globalConfig })
    await flushPromises()
    expect(wrapper.text()).toContain('chapter.play')
  })
})
