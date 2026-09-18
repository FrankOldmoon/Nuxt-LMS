/**
 * layout/aside.vue 组件测试
 * @see modules/lms/components/layout/aside.vue
 *
 * 侧边栏：CourseBtns + 班级选择按钮 + 内容管理 + 导航菜单 + ClassModal。
 * 使用 useAside()（来自 ./useAside.ts），内部依赖 useAuth/useAuthLms/useSidebarNav/useLayoutState。
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { ref, computed } from 'vue'
import { resetAllStubs, setMockI18n, setMockAuthUser } from '../../../../../test/setup/nuxt-stubs'

beforeEach(() => {
  resetAllStubs()
  setMockI18n({ locale: { value: 'en' }, t: (k: string) => k, d: (v: any) => String(v) })

  // stub indexNavItems（auto-import from useNavigation.ts）
  ;(globalThis as any).indexNavItems = (items: any[], _prefix: string, _addIndex: boolean) => items

  // stub useAuthLms（auto-import）
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

  // stub useSidebarNav（auto-import）— 返回 useAside 需要的字段
  ;(globalThis as any).useSidebarNav = () => ({
    navigation: ref([
      { label: 'Home', to: '/course/1' },
      { label: 'Chapter 1', to: '/course/1/1' },
    ]),
    courseId: ref('1'),
    refresh: vi.fn(),
    courseApiUrl: '/api/courses/show?id=1',
    accessibleChapterIds: ref(new Set([1])),
    passedChapterIds: ref(new Set()),
  })

  // 覆盖 useLayoutState stub
  ;(globalThis as any).useLayoutState = () => ({
    courseNavVersion: ref(0),
    showSidebar: ref(false),
    tocLinks: ref([]),
    chapterContent: ref(null),
    contentVersion: ref(0),
    mobileTocOpen: ref(false),
    sidebarOverride: ref(null),
    showDanmaku: ref(true),
    chapterBtnsConfig: ref({}),
    courseBtnsConfig: ref({}),
    setToc: vi.fn(),
    setChapterContent: vi.fn(),
    notifyContentSaved: vi.fn(),
    notifyCourseNavUpdate: vi.fn(),
    setLayout: vi.fn(),
  })
})

const _globalStubs = {
  // 组件模板已改用 Lazy* 前缀（defineAsyncComponent，避免重依赖进入首屏阻塞路径），
  // 测试环境无 Nuxt 自动导入，Lazy 与非 Lazy 两个名字都给出桩
  CourseBtns: { template: '<div class="course-btns" />', props: ['courseId', 'navigation'] },
  LazyCourseBtns: { template: '<div class="course-btns" />', props: ['courseId', 'navigation'] },
  UButton: { template: '<button @click="$emit(\'click\')">{{ label }}<slot /></button>', props: ['label', 'icon', 'color', 'variant', 'size'] },
  NuxtLink: { template: '<a :href="to" class="nuxt-link"><slot /></a>', props: ['to'] },
  UNavigationMenu: { template: '<div class="nav-menu" />', props: ['items', 'orientation', 'highlight', 'color'] },
  NavEditor: { template: '<div class="nav-editor" />', props: ['mode', 'courseId', 'navigation'] },
  LazyNavEditor: { template: '<div class="nav-editor" />', props: ['mode', 'courseId', 'navigation'] },
  UeditorContentPicker: { template: '<div v-if="modelValue" class="content-picker" />', props: ['modelValue', 'previewMode'] },
  LazyUeditorContentPicker: { template: '<div v-if="modelValue" class="content-picker" />', props: ['modelValue', 'previewMode'] },
  ClassModal: { template: '<div v-if="open" class="class-modal" />', props: ['open'] },
  LazyClassModal: { template: '<div v-if="open" class="class-modal" />', props: ['open'] },
  UModal: { template: '<div v-if="open" class="modal" />', props: ['open'] },
}

const _globalConfig = {
  mocks: { $t: (k: string) => k },
  stubs: _globalStubs,
}

describe('layout/aside.vue', () => {
  it('渲染侧边栏内容', async () => {
    setMockAuthUser({ id: 1, name: 'Alice', defaultClass: { id: 1, name: 'Class A' } })
    const { default: Aside } = await import('../../../components/layout/aside.vue')
    const wrapper = mount(Aside, { global: _globalConfig })
    await flushPromises()
    expect(wrapper.find('.course-btns').exists()).toBe(true)
  })

  it('用户已登录时显示班级选择按钮', async () => {
    setMockAuthUser({ id: 1, name: 'Alice', defaultClass: { id: 1, name: 'Class A' } })
    const { default: Aside } = await import('../../../components/layout/aside.vue')
    const wrapper = mount(Aside, { global: _globalConfig })
    await flushPromises()
    expect(wrapper.text()).toContain('Class A')
  })

  it('用户未登录时不显示班级选择按钮', async () => {
    // 不调用 setMockAuthUser → user 为 null
    const { default: Aside } = await import('../../../components/layout/aside.vue')
    const wrapper = mount(Aside, { global: _globalConfig })
    await flushPromises()
    expect(wrapper.text()).not.toContain('classSelector.selectClass')
  })

  it('渲染导航首项链接', async () => {
    setMockAuthUser(null)
    const { default: Aside } = await import('../../../components/layout/aside.vue')
    const wrapper = mount(Aside, { global: _globalConfig })
    await flushPromises()
    const link = wrapper.find('.nuxt-link')
    expect(link.exists()).toBe(true)
    expect(link.text()).toContain('Home')
  })

  it('渲染导航菜单', async () => {
    setMockAuthUser(null)
    const { default: Aside } = await import('../../../components/layout/aside.vue')
    const wrapper = mount(Aside, { global: _globalConfig })
    await flushPromises()
    expect(wrapper.find('.nav-menu').exists()).toBe(true)
  })

  it('admin 角色显示内容管理按钮', async () => {
    setMockAuthUser({ id: 1, name: 'Admin', roles: [{ code: 'admin' }] }, [{ code: 'admin' }])
    const { default: Aside } = await import('../../../components/layout/aside.vue')
    const wrapper = mount(Aside, { global: _globalConfig })
    await flushPromises()
    expect(wrapper.text()).toContain('courseData.editor')
  })
})
