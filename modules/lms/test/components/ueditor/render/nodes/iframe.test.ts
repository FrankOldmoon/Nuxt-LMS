/**
 * ueditor/render/nodes/iframe.vue 组件测试
 * @see modules/lms/components/ueditor/render/nodes/iframe.vue
 */
import { describe, it, expect, beforeEach } from 'vitest'
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
})
