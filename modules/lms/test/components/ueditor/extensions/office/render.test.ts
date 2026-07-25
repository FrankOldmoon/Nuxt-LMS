/**
 * office/render.vue 组件测试
 * @see modules/lms/components/ueditor/extensions/nodes/vue/office/render.vue
 *
 * 使用 iframe 嵌入 Office Online viewer
 */
import { describe, it, expect, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { resetAllStubs, setMockI18n } from '../../../../../../../test/setup/nuxt-stubs'

beforeEach(() => {
  resetAllStubs()
  setMockI18n({ locale: { value: 'en' }, t: (k: string) => k, d: (v: any) => String(v) })
})

const _globalConfig = {
  mocks: { $t: (k: string) => k },
}

describe('office/render.vue', () => {
  it('mounts and renders an iframe when url is set', async () => {
    const { default: OfficeRender } = await import(
      '../../../../../components/ueditor/extensions/nodes/vue/office/render.vue'
    )
    const wrapper = mount(OfficeRender, {
      props: {
        node: { attrs: { content: JSON.stringify({ url: 'https://example.com/doc.xlsx', height: 600 }) } },
      },
      global: _globalConfig,
    })
    await flushPromises()
    const iframe = wrapper.find('iframe')
    expect(iframe.exists()).toBe(true)
  })

  it('builds officeapps.live.com preview URL', async () => {
    const { default: OfficeRender } = await import(
      '../../../../../components/ueditor/extensions/nodes/vue/office/render.vue'
    )
    const wrapper = mount(OfficeRender, {
      props: {
        node: { attrs: { content: JSON.stringify({ url: 'https://example.com/doc.xlsx' }) } },
      },
      global: _globalConfig,
    })
    await flushPromises()
    const iframe = wrapper.find('iframe')
    expect(iframe.attributes('src')).toContain('view.officeapps.live.com/embed')
  })

  it('does not render iframe when url is missing', async () => {
    const { default: OfficeRender } = await import(
      '../../../../../components/ueditor/extensions/nodes/vue/office/render.vue'
    )
    const wrapper = mount(OfficeRender, {
      props: { node: { attrs: { content: JSON.stringify({}) } } },
      global: _globalConfig,
    })
    await flushPromises()
    expect(wrapper.find('iframe').exists()).toBe(false)
  })

  it('applies height from config', async () => {
    const { default: OfficeRender } = await import(
      '../../../../../components/ueditor/extensions/nodes/vue/office/render.vue'
    )
    const wrapper = mount(OfficeRender, {
      props: {
        node: { attrs: { content: JSON.stringify({ url: 'https://example.com/doc.xlsx', height: 800 }) } },
      },
      global: _globalConfig,
    })
    await flushPromises()
    const preview = wrapper.find('.office-render-preview')
    expect(preview.attributes('style') || '').toContain('800px')
  })
})
