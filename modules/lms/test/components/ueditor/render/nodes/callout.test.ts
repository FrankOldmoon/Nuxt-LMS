/**
 * ueditor/render/nodes/callout.vue component test
 * @see modules/lms/components/ueditor/render/nodes/callout.vue
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

describe('ueditor/render/nodes/callout.vue', () => {
  it('renders callout with icon and content', async () => {
    const { default: CalloutView } = await import('../../../../../components/ueditor/render/nodes/callout.vue')
    const wrapper = mount(CalloutView, {
      props: { node: { type: 'callout', attrs: { icon: '💡', fontColor: '#333', backgroundColor: '#ff0' }, content: [{ type: 'text', text: 'Note text' }] } },
      global: _globalConfig,
    })
    expect(wrapper.find('.umo-node-callout').exists()).toBe(true)
    expect(wrapper.text()).toContain('💡')
    expect(wrapper.html()).toContain('Note text')
  })

  it('does not render icon span when icon attr missing', async () => {
    const { default: CalloutView } = await import('../../../../../components/ueditor/render/nodes/callout.vue')
    const wrapper = mount(CalloutView, {
      props: { node: { type: 'callout', attrs: {}, content: [] } },
      global: _globalConfig,
    })
    expect(wrapper.find('.umo-node-callout-icon').exists()).toBe(false)
  })
})
