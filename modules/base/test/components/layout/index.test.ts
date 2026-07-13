/**
 * Layout 组件测试
 * @see modules/base/components/layout/index.vue
 *
 * 整体布局：Header + Main + Footer
 */
import { describe, it, expect, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { resetAllStubs, setMockI18n } from '../../../../../test/setup/nuxt-stubs'

beforeEach(() => {
  resetAllStubs()
  setMockI18n({ locale: { value: 'en' }, t: (k: string) => k, d: (v: any) => String(v) })
})

const _globalStubs = {
  LayoutHeader: { template: '<div class="header-stub" />' },
  UMain: { template: '<main class="main-stub"><slot /></main>' },
  UContainer: { template: '<div class="container-stub"><slot /></div>' },
  UPage: { template: '<div class="page-stub"><slot /></div>' },
  LayoutMain: { template: '<div class="layout-main-stub"><slot /></div>' },
  LayoutFooter: { template: '<div class="footer-stub" />' },
}

const _globalConfig = {
  mocks: {
    $t: (k: string) => k,
    $i18n: { t: (k: string) => k, locale: { value: 'en' } },
  },
  stubs: _globalStubs,
}

describe('layout/index.vue', () => {
  it('渲染包含 header、main、footer', async () => {
    const { default: Layout } = await import('../../../components/layout/index.vue')
    const wrapper = mount(Layout, { global: _globalConfig })
    expect(wrapper.find('.header-stub').exists()).toBe(true)
    expect(wrapper.find('.main-stub').exists()).toBe(true)
    expect(wrapper.find('.footer-stub').exists()).toBe(true)
  })

  it('渲染默认插槽内容', async () => {
    const { default: Layout } = await import('../../../components/layout/index.vue')
    const wrapper = mount(Layout, {
      global: _globalConfig,
      slots: { default: '<div class="page-content">页面内容</div>' },
    })
    expect(wrapper.find('.page-content').exists()).toBe(true)
    expect(wrapper.text()).toContain('页面内容')
  })

  it('main 区域包含 container 和 page', async () => {
    const { default: Layout } = await import('../../../components/layout/index.vue')
    const wrapper = mount(Layout, { global: _globalConfig })
    expect(wrapper.find('.container-stub').exists()).toBe(true)
    expect(wrapper.find('.page-stub').exists()).toBe(true)
    expect(wrapper.find('.layout-main-stub').exists()).toBe(true)
  })
})
