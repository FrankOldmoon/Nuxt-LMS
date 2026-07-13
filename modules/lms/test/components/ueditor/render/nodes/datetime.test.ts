/**
 * ueditor/render/nodes/datetime.vue 组件测试
 * @see modules/lms/components/ueditor/render/nodes/datetime.vue
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

describe('ueditor/render/nodes/datetime.vue', () => {
  it('renders the datetime text', async () => {
    const { default: Datetime } = await import('../../../../../components/ueditor/render/nodes/datetime.vue')
    const wrapper = mount(Datetime, {
      props: { node: { type: 'datetime', attrs: { text: '2024-01-15' } } },
      global: _globalConfig,
    })
    expect(wrapper.find('.umo-node-datetime').exists()).toBe(true)
    expect(wrapper.text()).toContain('2024-01-15')
  })

  it('renders empty when no text attr', async () => {
    const { default: Datetime } = await import('../../../../../components/ueditor/render/nodes/datetime.vue')
    const wrapper = mount(Datetime, { props: { node: { type: 'datetime', attrs: {} } }, global: _globalConfig })
    expect(wrapper.find('.umo-node-datetime-text').exists()).toBe(true)
  })
})
