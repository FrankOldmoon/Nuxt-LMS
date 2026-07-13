/**
 * pdf/render.vue 组件测试
 * @see modules/lms/components/ueditor/extensions/nodes/vue/pdf/render.vue
 *
 * PDF 渲染使用 pdf.js (canvas-based)，测试中仅验证容器结构
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

describe('pdf/render.vue', () => {
  it('mounts and renders container when url is set', async () => {
    const { default: PdfRender } = await import(
      '../../../../../components/ueditor/extensions/nodes/vue/pdf/render.vue'
    )
    const wrapper = mount(PdfRender, {
      props: {
        node: { attrs: { content: JSON.stringify({ url: 'https://example.com/doc.pdf' }) } },
      },
      global: _globalConfig,
    })
    await flushPromises()
    expect(wrapper.find('.pdf-render-container').exists()).toBe(true)
    expect(wrapper.find('.pdf-render-preview').exists()).toBe(true)
  })

  it('does not render preview when url is missing', async () => {
    const { default: PdfRender } = await import(
      '../../../../../components/ueditor/extensions/nodes/vue/pdf/render.vue'
    )
    const wrapper = mount(PdfRender, {
      props: { node: { attrs: { content: JSON.stringify({}) } } },
      global: _globalConfig,
    })
    await flushPromises()
    expect(wrapper.find('.pdf-render-preview').exists()).toBe(false)
  })

  it('mounts with empty node attrs', async () => {
    const { default: PdfRender } = await import(
      '../../../../../components/ueditor/extensions/nodes/vue/pdf/render.vue'
    )
    const wrapper = mount(PdfRender, {
      props: { node: { attrs: {} } },
      global: _globalConfig,
    })
    await flushPromises()
    expect(wrapper.find('.pdf-render-container').exists()).toBe(true)
  })
})
