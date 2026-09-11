/**
 * html/render.vue 组件测试
 * @see modules/lms/components/ueditor/extensions/nodes/vue/html/render.vue
 *
 * 使用 iframe + srcdoc + sandbox="allow-scripts" 隔离用户 HTML
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

describe('html/render.vue', () => {
  it('mounts and renders an iframe with srcdoc', async () => {
    const { default: HtmlRender } = await import(
      '../../../../../components/ueditor/extensions/nodes/vue/html/render.vue'
    )
    const wrapper = mount(HtmlRender, {
      props: { node: { attrs: { content: '<p>hello</p>' } } },
      global: _globalConfig,
    })
    await flushPromises()
    const iframe = wrapper.find('iframe')
    expect(iframe.exists()).toBe(true)
    expect(iframe.attributes('srcdoc')).toBeDefined()
  })

  it('sets sandbox="allow-scripts" on iframe', async () => {
    const { default: HtmlRender } = await import(
      '../../../../../components/ueditor/extensions/nodes/vue/html/render.vue'
    )
    const wrapper = mount(HtmlRender, {
      props: { node: { attrs: { content: '<p>hello</p>' } } },
      global: _globalConfig,
    })
    await flushPromises()
    const iframe = wrapper.find('iframe')
    expect(iframe.attributes('sandbox')).toBe('allow-scripts')
  })

  it('wraps fragment HTML into a full document in srcdoc', async () => {
    const { default: HtmlRender } = await import(
      '../../../../../components/ueditor/extensions/nodes/vue/html/render.vue'
    )
    const wrapper = mount(HtmlRender, {
      props: { node: { attrs: { content: '<h1>Title</h1>' } } },
      global: _globalConfig,
    })
    await flushPromises()
    const srcdoc = wrapper.find('iframe').attributes('srcdoc') || ''
    // For fragment HTML, the srcdoc should be wrapped into a full document
    expect(srcdoc).toContain('<!DOCTYPE html>')
    expect(srcdoc).toContain('<h1>Title</h1>')
  })

  it('uses full HTML document directly when content is a full doc', async () => {
    const { default: HtmlRender } = await import(
      '../../../../../components/ueditor/extensions/nodes/vue/html/render.vue'
    )
    const fullDoc = '<!DOCTYPE html><html><head></head><body><p>full</p></body></html>'
    const wrapper = mount(HtmlRender, {
      props: { node: { attrs: { content: fullDoc } } },
      global: _globalConfig,
    })
    await flushPromises()
    const srcdoc = wrapper.find('iframe').attributes('srcdoc') || ''
    // 完整文档保留原内容，并在 </body> 前注入高度上报脚本
    expect(srcdoc).toContain('<p>full</p>')
    expect(srcdoc).toContain('html-node-height')
    expect(srcdoc.indexOf('html-node-height')).toBeLessThan(srcdoc.indexOf('</body>'))
  })

  it('renders fullscreen button', async () => {
    const { default: HtmlRender } = await import(
      '../../../../../components/ueditor/extensions/nodes/vue/html/render.vue'
    )
    const wrapper = mount(HtmlRender, {
      props: { node: { attrs: { content: '<p>hello</p>' } } },
      global: _globalConfig,
    })
    await flushPromises()
    const btn = wrapper.find('button')
    expect(btn.exists()).toBe(true)
    expect(btn.text()).toContain('fullscreen')
  })
})
