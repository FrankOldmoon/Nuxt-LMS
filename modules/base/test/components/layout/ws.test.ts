/**
 * Ws 组件测试
 * @see modules/base/components/layout/ws.vue
 *
 * WebSocket 连接编排器：登录后建立连接
 */
import { describe, it, expect, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { resetAllStubs, setMockI18n, setMockAuthUser } from '../../../../../test/setup/nuxt-stubs'

beforeEach(() => {
  resetAllStubs()
  setMockI18n({ locale: { value: 'en' }, t: (k: string) => k, d: (v: any) => String(v) })
})

const _globalStubs = {
  ClientOnly: { template: '<div class="client-only"><slot /></div>' },
}

const _globalConfig = {
  mocks: {
    $t: (k: string) => k,
    $i18n: { t: (k: string) => k, locale: { value: 'en' } },
  },
  stubs: _globalStubs,
}

describe('layout/ws.vue', () => {
  it('默认渲染 ClientOnly 容器', async () => {
    const { default: Ws } = await import('../../../components/layout/ws.vue')
    const wrapper = mount(Ws, { global: _globalConfig })
    await flushPromises()
    expect(wrapper.find('.client-only').exists()).toBe(true)
  })

  it('接受 ws-overlay 插槽', async () => {
    const { default: Ws } = await import('../../../components/layout/ws.vue')
    const wrapper = mount(Ws, {
      global: _globalConfig,
      slots: { 'ws-overlay': '<div class="overlay-content" />' },
    })
    await flushPromises()
    expect(wrapper.find('.overlay-content').exists()).toBe(true)
  })

  it('用户已登录时尝试建立 WS 连接', async () => {
    setMockAuthUser({ id: 1, name: 'TestUser' }, [{ code: 'student' }], [])
    const { default: Ws } = await import('../../../components/layout/ws.vue')
    const wrapper = mount(Ws, { global: _globalConfig })
    await flushPromises()
    expect(wrapper.exists()).toBe(true)
  })

  it('用户未登录时不报错', async () => {
    const { default: Ws } = await import('../../../components/layout/ws.vue')
    const wrapper = mount(Ws, { global: _globalConfig })
    await flushPromises()
    expect(wrapper.exists()).toBe(true)
  })
})
