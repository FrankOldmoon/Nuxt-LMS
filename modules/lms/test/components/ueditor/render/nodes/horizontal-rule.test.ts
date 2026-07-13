/**
 * ueditor/render/nodes/horizontal-rule.vue 组件测试
 * @see modules/lms/components/ueditor/render/nodes/horizontal-rule.vue
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

describe('ueditor/render/nodes/horizontal-rule.vue', () => {
  it('renders an <hr> element', async () => {
    const { default: Hr } = await import('../../../../../components/ueditor/render/nodes/horizontal-rule.vue')
    const wrapper = mount(Hr, { props: { node: { type: 'horizontalRule' } }, global: _globalConfig })
    expect(wrapper.find('hr').exists()).toBe(true)
  })

  it('binds data-type from attrs', async () => {
    const { default: Hr } = await import('../../../../../components/ueditor/render/nodes/horizontal-rule.vue')
    const wrapper = mount(Hr, {
      props: { node: { type: 'horizontalRule', attrs: { 'data-type': 'double' } } },
      global: _globalConfig,
    })
    expect(wrapper.find('hr').attributes('data-type')).toBe('double')
  })

  it('defaults data-type to single', async () => {
    const { default: Hr } = await import('../../../../../components/ueditor/render/nodes/horizontal-rule.vue')
    const wrapper = mount(Hr, { props: { node: { type: 'horizontalRule', attrs: {} } }, global: _globalConfig })
    expect(wrapper.find('hr').attributes('data-type')).toBe('single')
  })
})
