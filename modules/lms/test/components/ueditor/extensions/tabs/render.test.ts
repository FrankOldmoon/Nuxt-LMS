/**
 * tabs/render.vue 组件测试
 * @see modules/lms/components/ueditor/extensions/nodes/vue/tabs/render.vue
 */
import { describe, it, expect, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { resetAllStubs, setMockI18n } from '../../../../../../../test/setup/nuxt-stubs'

beforeEach(() => {
  resetAllStubs()
  setMockI18n({ locale: { value: 'en' }, t: (k: string) => k, d: (v: any) => String(v) })
})

const _globalStubs = {
  UTabs: { template: '<div class="utabs-stub"><slot name="content" :item="{ content: \'\' }" /></div>', props: ['items'] },
  ueditorRender: { template: '<div class="ueditor-render-stub" />', props: ['json'] },
}

const _globalConfig = {
  stubs: _globalStubs,
  mocks: { $t: (k: string) => k },
}

describe('tabs/render.vue', () => {
  it('mounts and renders tabs container', async () => {
    const { default: TabsRender } = await import(
      '../../../../../components/ueditor/extensions/nodes/vue/tabs/render.vue'
    )
    const wrapper = mount(TabsRender, {
      props: { node: { attrs: { content: JSON.stringify({ tabs: [{ label: 'Tab 1', content: '' }] }) } } },
      global: _globalConfig,
    })
    await flushPromises()
    expect(wrapper.find('.tabs-render-container').exists()).toBe(true)
  })

  it('uses default tabs when config is empty', async () => {
    const { default: TabsRender } = await import(
      '../../../../../components/ueditor/extensions/nodes/vue/tabs/render.vue'
    )
    const wrapper = mount(TabsRender, {
      props: { node: { attrs: { content: '' } } },
      global: _globalConfig,
    })
    await flushPromises()
    expect(wrapper.find('.utabs-stub').exists()).toBe(true)
  })

  it('passes tabs from config', async () => {
    const { default: TabsRender } = await import(
      '../../../../../components/ueditor/extensions/nodes/vue/tabs/render.vue'
    )
    const wrapper = mount(TabsRender, {
      props: {
        node: {
          attrs: {
            content: JSON.stringify({
              tabs: [
                { label: 'A', content: 'content-a' },
                { label: 'B', content: 'content-b' },
              ],
            }),
          },
        },
      },
      global: _globalConfig,
    })
    await flushPromises()
    expect(wrapper.find('.utabs-stub').exists()).toBe(true)
  })
})
