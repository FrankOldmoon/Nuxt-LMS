/**
 * menu/Navigation.vue component tests
 * @see modules/admin/components/menu/Navigation.vue
 *
 * Backend left navigation: overview link + menu tree + mobile drawer + editor entry
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { ref } from 'vue'
import { resetAllStubs, setMockI18n } from '../../../../../test/setup/nuxt-stubs'

beforeEach(() => {
  resetAllStubs()
  setMockI18n({ locale: { value: 'en' }, t: (k: string) => k, d: (v: any) => String(v) })
  // stub useAdminMenu
  ;(globalThis as any).useAdminMenu = () => ({
    visibleItems: ref([
      { label: 'Users', table: 'users', visible: true, order: 0, to: '/dashboard/t/users', icon: 'i-lucide-users' },
      { label: 'Courses', table: 'courses', visible: true, order: 1, to: '/dashboard/t/courses' },
    ]),
    items: ref([]),
    pending: ref(false),
    load: vi.fn(async () => {}),
    save: vi.fn(async () => {}),
    reorder: vi.fn(),
    refreshMenu: vi.fn(async () => {}),
  })
})

const _globalStubs = {
  NuxtLink: { template: '<a class="nuxt-link" :href="to"><slot /></a>', props: ['to'] },
  UIcon: { template: '<span class="uicon" />', props: ['name'] },
  UButton: {
    template: '<button class="ubutton" @click="$emit(\'click\', $event)">{{ label }}<slot /></button>',
    props: ['icon', 'variant', 'size', 'color', 'label'],
  },
  UNavigationMenu: { template: '<nav class="unavigation-menu"><ul><li v-for="item in items" :key="item.label">{{ item.label }}</li></ul></nav>', props: ['items', 'orientation', 'highlight', 'color'] },
  USlideover: { template: '<div class="uslideover" v-if="open"><slot name="body" /></div>', props: ['open', 'side', 'title'] },
  MenuEditor: { template: '<div class="menu-editor" />', props: ['open'] },
}

const _globalConfig = {
  mocks: { $t: (k: string) => k },
  stubs: _globalStubs,
}

describe('menu/Navigation.vue', () => {
  it('渲染概览链接', async () => {
    const { default: Navigation } = await import('../../../components/menu/Navigation.vue')
    const wrapper = mount(Navigation, { global: _globalConfig })
    await flushPromises()
    const link = wrapper.find('.nuxt-link')
    expect(link.exists()).toBe(true)
    expect(link.attributes('href')).toBe('/dashboard')
  })

  it('渲染编辑菜单按钮', async () => {
    const { default: Navigation } = await import('../../../components/menu/Navigation.vue')
    const wrapper = mount(Navigation, { global: _globalConfig })
    await flushPromises()
    expect(wrapper.text()).toContain('admin.menu.edit')
  })

  it('渲染桌面竖直菜单', async () => {
    const { default: Navigation } = await import('../../../components/menu/Navigation.vue')
    const wrapper = mount(Navigation, { global: _globalConfig })
    await flushPromises()
    expect(wrapper.find('.unavigation-menu').exists()).toBe(true)
  })

  it('渲染移动端触发按钮', async () => {
    const { default: Navigation } = await import('../../../components/menu/Navigation.vue')
    const wrapper = mount(Navigation, { global: _globalConfig })
    await flushPromises()
    expect(wrapper.text()).toContain('admin.menu.tables')
  })

  it('点击编辑按钮打开编辑器', async () => {
    const { default: Navigation } = await import('../../../components/menu/Navigation.vue')
    const wrapper = mount(Navigation, { global: _globalConfig })
    await flushPromises()
    const editBtn = wrapper.findAll('.ubutton').find(b => b.text().includes('admin.menu.edit'))
    expect(editBtn).toBeTruthy()
    await editBtn!.trigger('click')
    expect(wrapper.find('.menu-editor').exists()).toBe(true)
  })
})
