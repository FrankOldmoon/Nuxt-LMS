/**
 * layout/header/nav.vue 组件测试
 * @see modules/lms/components/layout/header/nav.vue
 *
 * 顶部导航：UNavigationMenu + NavEditor + 课程导入按钮。
 * 使用 useNav()（来自 ./useNav.ts），内部依赖 useAuth/useHeaderNav。
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { ref } from 'vue'
import { resetAllStubs, setMockI18n } from '../../../../../../test/setup/nuxt-stubs'

beforeEach(() => {
  resetAllStubs()
  setMockI18n({ locale: { value: 'en' }, t: (k: string) => k, d: (v: any) => String(v) })

  // stub useHeaderNav（auto-import）
  ;(globalThis as any).useHeaderNav = () => ({
    links: ref([
      { label: 'Home', to: '/' },
      { label: 'Course A', to: '/course/1' },
    ]),
    refresh: vi.fn(),
  })
})

const _globalStubs = {
  UNavigationMenu: { template: '<div class="nav-menu" />', props: ['items', 'orientation', 'highlight', 'color', 'variant', 'ui', 'contentOrientation'] },
  UButton: { template: '<button :loading="loading" @click="$emit(\'click\')">{{ label }}<slot /></button>', props: ['icon', 'color', 'variant', 'size', 'label', 'loading'] },
  UTooltip: { template: '<span class="tooltip"><slot /></span>', props: ['text'] },
  NavEditor: { template: '<div class="nav-editor" />', props: ['mode', 'navigation'] },
}

const _globalConfig = {
  mocks: { $t: (k: string) => k },
  stubs: _globalStubs,
}

describe('layout/header/nav.vue', () => {
  it('渲染导航菜单', async () => {
    const { default: Nav } = await import('../../../../components/layout/header/nav.vue')
    const wrapper = mount(Nav, { global: _globalConfig })
    await flushPromises()
    expect(wrapper.find('.nav-menu').exists()).toBe(true)
  })

  it('默认 orientation=horizontal', async () => {
    const { default: Nav } = await import('../../../../components/layout/header/nav.vue')
    const wrapper = mount(Nav, { global: _globalConfig })
    await flushPromises()
    expect(wrapper.props('orientation')).toBe('horizontal')
  })

  it('接受 orientation=vertical prop', async () => {
    const { default: Nav } = await import('../../../../components/layout/header/nav.vue')
    const wrapper = mount(Nav, {
      props: { orientation: 'vertical' },
      global: _globalConfig,
    })
    await flushPromises()
    expect(wrapper.props('orientation')).toBe('vertical')
  })

  it('默认 highlight=true', async () => {
    const { default: Nav } = await import('../../../../components/layout/header/nav.vue')
    const wrapper = mount(Nav, { global: _globalConfig })
    await flushPromises()
    expect(wrapper.props('highlight')).toBe(true)
  })

  it('admin 角色显示课程导入按钮', async () => {
    // useAuth stub 返回 hasRole: (c) => c === 'admin'
    const { useAuth } = await import('../../../../../../test/setup/nuxt-stubs')
    const origUseAuth = (globalThis as any).useAuth
    ;(globalThis as any).useAuth = () => ({
      ...useAuth(),
      hasRole: (code: string) => code === 'admin',
      user: ref({ id: 1 }),
    })
    const { default: Nav } = await import('../../../../components/layout/header/nav.vue')
    const wrapper = mount(Nav, { global: _globalConfig })
    await flushPromises()
    // admin 可见 NavEditor + 导入按钮
    expect(wrapper.find('.nav-editor').exists()).toBe(true)
    // 恢复
    ;(globalThis as any).useAuth = origUseAuth
  })

  it('非 admin 角色不显示课程导入按钮', async () => {
    const { useAuth } = await import('../../../../../../test/setup/nuxt-stubs')
    const origUseAuth = (globalThis as any).useAuth
    ;(globalThis as any).useAuth = () => ({
      ...useAuth(),
      hasRole: () => false,
      user: ref(null),
    })
    const { default: Nav } = await import('../../../../components/layout/header/nav.vue')
    const wrapper = mount(Nav, { global: _globalConfig })
    await flushPromises()
    expect(wrapper.find('.nav-editor').exists()).toBe(false)
    ;(globalThis as any).useAuth = origUseAuth
  })
})
