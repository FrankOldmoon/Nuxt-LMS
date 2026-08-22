/**
 * ueditor/render/nodes/iframe.vue 组件测试
 * @see modules/lms/components/ueditor/render/nodes/iframe.vue
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { resetAllStubs, setMockI18n } from '../../../../../../../test/setup/nuxt-stubs'

beforeEach(() => {
  resetAllStubs()
  setMockI18n({ locale: { value: 'en' }, t: (k: string) => k, d: (v: any) => String(v) })
})

const _globalConfig = {
  mocks: { $t: (k: string) => k, $i18n: { t: (k: string) => k, locale: { value: 'en' } } },
  stubs: {},
}

describe('ueditor/render/nodes/iframe.vue', () => {
  it('renders an <iframe> with src', async () => {
    const { default: IframeView } = await import('../../../../../components/ueditor/render/nodes/iframe.vue')
    const wrapper = mount(IframeView, {
      props: { node: { type: 'iframe', attrs: { src: 'https://example.com' } } },
      global: _globalConfig,
    })
    const iframe = wrapper.find('iframe')
    expect(iframe.exists()).toBe(true)
    expect(iframe.attributes('src')).toBe('https://example.com')
  })

  it('uses default height 200px when not specified', async () => {
    const { default: IframeView } = await import('../../../../../components/ueditor/render/nodes/iframe.vue')
    const wrapper = mount(IframeView, {
      props: { node: { type: 'iframe', attrs: { src: '/page' } } },
      global: _globalConfig,
    })
    expect(wrapper.find('iframe').attributes('style') || '').toContain('height: 200px')
  })

  it('applies custom height from attrs', async () => {
    const { default: IframeView } = await import('../../../../../components/ueditor/render/nodes/iframe.vue')
    const wrapper = mount(IframeView, {
      props: { node: { type: 'iframe', attrs: { src: '/page', height: 500 } } },
      global: _globalConfig,
    })
    expect(wrapper.find('iframe').attributes('style') || '').toContain('height: 500px')
  })

  it('renders 打开网页按钮与全屏按钮', async () => {
    const { default: IframeView } = await import('../../../../../components/ueditor/render/nodes/iframe.vue')
    const wrapper = mount(IframeView, {
      props: { node: { type: 'iframe', attrs: { src: 'https://example.com/page' } } },
      global: _globalConfig,
    })
    expect(wrapper.find('.iframe-open-btn').exists()).toBe(true)
    expect(wrapper.find('.iframe-fullscreen-btn').exists()).toBe(true)
  })

  it('点击打开网页按钮在新标签页打开完整 URL', async () => {
    const openSpy = vi.spyOn(window, 'open').mockImplementation(() => null)
    const { default: IframeView } = await import('../../../../../components/ueditor/render/nodes/iframe.vue')
    const wrapper = mount(IframeView, {
      props: { node: { type: 'iframe', attrs: { src: '/page' } } },
      global: _globalConfig,
    })
    await wrapper.find('.iframe-open-btn').trigger('click')
    const href = (String((window.open as any).mock.calls[0][0]))
    expect(href.endsWith('/page')).toBe(true)
    expect((window.open as any).mock.calls[0][1]).toBe('_blank')
    openSpy.mockRestore()
  })
})
