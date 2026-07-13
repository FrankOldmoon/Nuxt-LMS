/**
 * ueditor/render/nodes/table.vue 组件测试
 * @see modules/lms/components/ueditor/render/nodes/table.vue
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

describe('ueditor/render/nodes/table.vue', () => {
  it('renders a <table> with tbody', async () => {
    const { default: Table } = await import('../../../../../components/ueditor/render/nodes/table.vue')
    const wrapper = mount(Table, {
      props: { node: { type: 'table', content: [{ type: 'tableRow', content: [] }] } },
      global: _globalConfig,
    })
    expect(wrapper.find('table').exists()).toBe(true)
    expect(wrapper.find('tbody').exists()).toBe(true)
  })
})
