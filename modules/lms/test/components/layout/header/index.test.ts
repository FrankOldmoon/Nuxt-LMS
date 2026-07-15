/**
 * layout/header/index.vue component test
 * @see modules/lms/components/layout/header/index.vue
 *
 * Header container: wraps BaseHeader, injects navigation and search.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { resetAllStubs, setMockI18n } from '../../../../../../test/setup/nuxt-stubs'

beforeEach(() => {
  resetAllStubs()
  setMockI18n({ locale: { value: 'en' }, t: (k: string) => k, d: (v: any) => String(v) })
})

const _globalStubs = {
  // BaseHeader is imported via explicit import, stubbed as slot pass-through
  BaseHeader: {
    template: '<div class="base-header"><slot name="nav" /><slot name="header-right" /><slot name="nav-mobile" /></div>',
  },
  // LayoutHeaderNav / LayoutSearchModal are Nuxt auto-import components
  LayoutHeaderNav: { template: '<div class="layout-nav" />', props: ['orientation', 'class'] },
  LayoutSearchModal: { template: '<div class="layout-search-modal" />', emits: ['close'] },
  UModal: {
    template: '<div><slot /><div v-if="open" class="modal"><slot name="content" /></div></div>',
    props: ['open'],
  },
  UTooltip: { template: '<span class="tooltip"><slot /></span>', props: ['text'] },
  UButton: { template: '<button @click="$emit(\'click\')">{{ label }}<slot /></button>', props: ['icon', 'color', 'variant', 'label'] },
}

const _globalConfig = {
  mocks: { $t: (k: string) => k },
  stubs: _globalStubs,
}

describe('layout/header/index.vue', () => {
  it('渲染 BaseHeader', async () => {
    const { default: Header } = await import('../../../../components/layout/header/index.vue')
    const wrapper = mount(Header, { global: _globalConfig })
    await flushPromises()
    expect(wrapper.find('.base-header').exists()).toBe(true)
  })

  it('注入导航 slot', async () => {
    const { default: Header } = await import('../../../../components/layout/header/index.vue')
    const wrapper = mount(Header, { global: _globalConfig })
    await flushPromises()
    expect(wrapper.find('.layout-nav').exists()).toBe(true)
  })

  it('渲染搜索按钮', async () => {
    const { default: Header } = await import('../../../../components/layout/header/index.vue')
    const wrapper = mount(Header, { global: _globalConfig })
    await flushPromises()
    // common.search is passed as aria-label to UButton
    const searchBtn = wrapper.find('button[aria-label="common.search"]')
    expect(searchBtn.exists()).toBe(true)
  })
})
