/**
 * vfiles/render.vue 组件测试
 * @see modules/lms/components/ueditor/extensions/nodes/vue/vfiles/render.vue
 */
import { describe, it, expect, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { resetAllStubs, setMockI18n } from '../../../../../../../test/setup/nuxt-stubs'

beforeEach(() => {
  resetAllStubs()
  setMockI18n({ locale: { value: 'en' }, t: (k: string) => k, d: (v: any) => String(v) })
})

const _globalStubs = {
  UNavigationMenu: { template: '<div class="unavigation-menu-stub" />', props: ['items', 'orientation'] },
  ueditorRender: { template: '<div class="ueditor-render-stub" />', props: ['json'] },
  UIcon: { template: '<span />', props: ['name'] },
}

const _globalConfig = {
  stubs: _globalStubs,
  mocks: { $t: (k: string) => k },
}

describe('vfiles/render.vue', () => {
  it('mounts and renders container', async () => {
    const { default: VfilesRender } = await import(
      '../../../../../components/ueditor/extensions/nodes/vue/vfiles/render.vue'
    )
    const wrapper = mount(VfilesRender, {
      props: { node: { attrs: { content: JSON.stringify({ items: [] }) } } },
      global: _globalConfig,
    })
    await flushPromises()
    expect(wrapper.find('.vfiles-render-container').exists()).toBe(true)
  })

  it('shows select hint when no file selected', async () => {
    const { default: VfilesRender } = await import(
      '../../../../../components/ueditor/extensions/nodes/vue/vfiles/render.vue'
    )
    const wrapper = mount(VfilesRender, {
      props: { node: { attrs: { content: JSON.stringify({ items: [] }) } } },
      global: _globalConfig,
    })
    await flushPromises()
    expect(wrapper.text()).toContain('ueditor.vfilesSelectHint')
  })

  it('renders navigation menu with items', async () => {
    const { default: VfilesRender } = await import(
      '../../../../../components/ueditor/extensions/nodes/vue/vfiles/render.vue'
    )
    const wrapper = mount(VfilesRender, {
      props: {
        node: {
          attrs: {
            content: JSON.stringify({
              items: [
                { id: '1', type: 'file', label: 'File 1', content: 'hello' },
              ],
            }),
          },
        },
      },
      global: _globalConfig,
    })
    await flushPromises()
    expect(wrapper.find('.unavigation-menu-stub').exists()).toBe(true)
  })

  it('auto-selects first file and shows its label', async () => {
    const { default: VfilesRender } = await import(
      '../../../../../components/ueditor/extensions/nodes/vue/vfiles/render.vue'
    )
    const wrapper = mount(VfilesRender, {
      props: {
        node: {
          attrs: {
            content: JSON.stringify({
              items: [
                { id: 'f1', type: 'file', label: 'My File', content: 'content-1' },
              ],
            }),
          },
        },
      },
      global: _globalConfig,
    })
    await flushPromises()
    expect(wrapper.text()).toContain('My File')
  })
})
