/**
 * Main component tests
 * @see modules/base/components/layout/main.vue
 *
 * Page body: slot + WebSocket connection
 */
import { describe, it, expect, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { resetAllStubs, setMockI18n } from '../../../../../test/setup/nuxt-stubs'

beforeEach(() => {
  resetAllStubs()
  setMockI18n({ locale: { value: 'en' }, t: (k: string) => k, d: (v: any) => String(v) })
})

const _globalStubs = {
  UPageBody: { template: '<div class="page-body"><slot /></div>' },
  LayoutWs: { template: '<div class="ws-stub" />' },
}

const _globalConfig = {
  mocks: {
    $t: (k: string) => k,
    $i18n: { t: (k: string) => k, locale: { value: 'en' } },
  },
  stubs: _globalStubs,
}

describe('layout/main.vue', () => {
  it('渲染页面主体容器', async () => {
    const { default: Main } = await import('../../../components/layout/main.vue')
    const wrapper = mount(Main, { global: _globalConfig })
    expect(wrapper.find('.page-body').exists()).toBe(true)
  })

  it('渲染默认插槽内容', async () => {
    const { default: Main } = await import('../../../components/layout/main.vue')
    const wrapper = mount(Main, {
      global: _globalConfig,
      slots: { default: '<p class="slot-content">页面内容</p>' },
    })
    expect(wrapper.find('.slot-content').exists()).toBe(true)
    expect(wrapper.text()).toContain('页面内容')
  })

  it('包含 LayoutWs 组件', async () => {
    const { default: Main } = await import('../../../components/layout/main.vue')
    const wrapper = mount(Main, { global: _globalConfig })
    expect(wrapper.find('.ws-stub').exists()).toBe(true)
  })
})
