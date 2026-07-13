/**
 * mindmap/render.vue 组件测试
 * @see modules/lms/components/ueditor/extensions/nodes/vue/mindmap/render.vue
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

describe('mindmap/render.vue', () => {
  it('mounts and renders the mindmap container', async () => {
    const { default: MindmapRender } = await import(
      '../../../../../components/ueditor/extensions/nodes/vue/mindmap/render.vue'
    )
    const wrapper = mount(MindmapRender, {
      props: { node: { attrs: { content: '# Title' } } },
      global: _globalConfig,
    })
    await flushPromises()
    expect(wrapper.find('.mindmap-render-wrapper').exists()).toBe(true)
    expect(wrapper.find('.mindmap-render-preview').exists()).toBe(true)
  })

  it('mounts with empty content', async () => {
    const { default: MindmapRender } = await import(
      '../../../../../components/ueditor/extensions/nodes/vue/mindmap/render.vue'
    )
    const wrapper = mount(MindmapRender, {
      props: { node: { attrs: {} } },
      global: _globalConfig,
    })
    await flushPromises()
    expect(wrapper.find('.mindmap-render-wrapper').exists()).toBe(true)
  })
})
