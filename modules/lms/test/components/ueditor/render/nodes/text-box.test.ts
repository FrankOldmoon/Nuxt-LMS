/**
 * ueditor/render/nodes/text-box.vue 组件测试
 * @see modules/lms/components/ueditor/render/nodes/text-box.vue
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

describe('ueditor/render/nodes/text-box.vue', () => {
  it('renders a text-box container with content', async () => {
    const { default: TextBoxView } = await import('../../../../../components/ueditor/render/nodes/text-box.vue')
    const wrapper = mount(TextBoxView, {
      props: {
        node: {
          type: 'textBox',
          attrs: { id: 'tb1', borderColor: '#000', borderWidth: 1, borderStyle: 'solid', backgroundColor: '#fff' },
          content: [{ type: 'text', text: 'Box content' }],
        },
      },
      global: _globalConfig,
    })
    expect(wrapper.find('.umo-node-text-box').exists()).toBe(true)
    expect(wrapper.html()).toContain('Box content')
  })

  it('binds id from attrs', async () => {
    const { default: TextBoxView } = await import('../../../../../components/ueditor/render/nodes/text-box.vue')
    const wrapper = mount(TextBoxView, {
      props: { node: { type: 'textBox', attrs: { id: 'my-box' }, content: [] } },
      global: _globalConfig,
    })
    expect(wrapper.find('.umo-node-view').attributes('id')).toBe('my-box')
  })

  it('applies angle rotation when angle attr is set', async () => {
    const { default: TextBoxView } = await import('../../../../../components/ueditor/render/nodes/text-box.vue')
    const wrapper = mount(TextBoxView, {
      props: { node: { type: 'textBox', attrs: { angle: 45 }, content: [] } },
      global: _globalConfig,
    })
    expect(wrapper.html()).toContain('rotate(45deg)')
  })
})
