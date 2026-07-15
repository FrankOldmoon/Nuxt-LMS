/**
 * chapter/danmaku/index.vue component test
 * @see modules/lms/components/chapter/danmaku/index.vue
 *
 * Danmaku overlay: listens to useWebSocket().onDanmaku, renders flying text for 8 seconds after receiving danmaku then removes.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { resetAllStubs, setMockI18n } from '../../../../../../test/setup/nuxt-stubs'

beforeEach(() => {
  resetAllStubs()
  setMockI18n({ locale: { value: 'en' }, t: (k: string) => k, d: (v: any) => String(v) })
})

describe('chapter/danmaku/index.vue', () => {
  it('默认渲染浮层容器（无弹幕时为空）', async () => {
    ;(globalThis as any).useWebSocket = () => ({ onDanmaku: () => () => {} })
    const { default: Danmaku } = await import('../../../../components/chapter/danmaku/index.vue')
    const wrapper = mount(Danmaku, { global: { mocks: { $t: (k: string) => k } } })
    expect(wrapper.exists()).toBe(true)
    // Container fixed inset-0
    expect(wrapper.find('.fixed').exists()).toBe(true)
  })

  it('收到 onDanmaku 回调后渲染弹幕项', async () => {
    let registeredCb: ((data: any) => void) | null = null
    ;(globalThis as any).useWebSocket = () => ({
      onDanmaku: (cb: (data: any) => void) => { registeredCb = cb; return () => {} },
    })
    const { default: Danmaku } = await import('../../../../components/chapter/danmaku/index.vue')
    const wrapper = mount(Danmaku, { global: { mocks: { $t: (k: string) => k } } })
    await flushPromises()
    expect(registeredCb).toBeTruthy()
    ;(registeredCb as any)({ text: '你好', from: '学生A' })
    await flushPromises()
    expect(wrapper.text()).toContain('你好')
    expect(wrapper.text()).toContain('学生A')
  })

  it('弹幕项格式为 from：text', async () => {
    let registeredCb: ((data: any) => void) | null = null
    ;(globalThis as any).useWebSocket = () => ({
      onDanmaku: (cb: (data: any) => void) => { registeredCb = cb; return () => {} },
    })
    const { default: Danmaku } = await import('../../../../components/chapter/danmaku/index.vue')
    const wrapper = mount(Danmaku, { global: { mocks: { $t: (k: string) => k } } })
    await flushPromises()
    ;(registeredCb as any)({ text: '测试弹幕', from: '老师' })
    await flushPromises()
    expect(wrapper.text()).toContain('老师：测试弹幕')
  })

  it('多条弹幕同时渲染', async () => {
    let registeredCb: ((data: any) => void) | null = null
    ;(globalThis as any).useWebSocket = () => ({
      onDanmaku: (cb: (data: any) => void) => { registeredCb = cb; return () => {} },
    })
    const { default: Danmaku } = await import('../../../../components/chapter/danmaku/index.vue')
    const wrapper = mount(Danmaku, { global: { mocks: { $t: (k: string) => k } } })
    await flushPromises()
    ;(registeredCb as any)({ text: '弹幕1', from: 'A' })
    ;(registeredCb as any)({ text: '弹幕2', from: 'B' })
    ;(registeredCb as any)({ text: '弹幕3', from: 'C' })
    await flushPromises()
    expect(wrapper.text()).toContain('弹幕1')
    expect(wrapper.text()).toContain('弹幕2')
    expect(wrapper.text()).toContain('弹幕3')
  })
})
