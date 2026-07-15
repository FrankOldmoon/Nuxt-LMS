/**
 * ueditor/render/nodes/table-row.vue component test
 * @see modules/lms/components/ueditor/render/nodes/table-row.vue
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

describe('ueditor/render/nodes/table-row.vue', () => {
  it('renders a <tr> element', async () => {
    const { default: TableRow } = await import('../../../../../components/ueditor/render/nodes/table-row.vue')
    const wrapper = mount(TableRow, {
      props: { node: { type: 'tableRow', content: [{ type: 'tableCell', content: [] }] } },
      global: _globalConfig,
    })
    expect(wrapper.find('tr').exists()).toBe(true)
  })
})
