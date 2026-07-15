/**
 * ueditor/render/nodes/mention.vue component test
 * @see modules/lms/components/ueditor/render/nodes/mention.vue
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

describe('ueditor/render/nodes/mention.vue', () => {
  it('renders the mention label', async () => {
    const { default: Mention } = await import('../../../../../components/ueditor/render/nodes/mention.vue')
    const wrapper = mount(Mention, {
      props: { node: { type: 'mention', attrs: { id: 5, label: 'Alice' } } },
      global: _globalConfig,
    })
    expect(wrapper.find('.umo-node-mention').exists()).toBe(true)
    expect(wrapper.text()).toContain('Alice')
    expect(wrapper.find('.umo-node-mention').attributes('data-id')).toBe('5')
  })

  it('renders empty when no label', async () => {
    const { default: Mention } = await import('../../../../../components/ueditor/render/nodes/mention.vue')
    const wrapper = mount(Mention, { props: { node: { type: 'mention', attrs: {} } }, global: _globalConfig })
    expect(wrapper.find('.umo-node-mention').exists()).toBe(true)
  })
})
