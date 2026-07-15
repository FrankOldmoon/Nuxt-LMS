/**
 * ueditor/render/nodes/table-cell.vue component test
 * @see modules/lms/components/ueditor/render/nodes/table-cell.vue
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

describe('ueditor/render/nodes/table-cell.vue', () => {
  it('renders a <td> with content', async () => {
    const { default: TableCell } = await import('../../../../../components/ueditor/render/nodes/table-cell.vue')
    const wrapper = mount(TableCell, {
      props: { node: { type: 'tableCell', attrs: {}, content: [{ type: 'text', text: 'Cell text' }] } },
      global: _globalConfig,
    })
    expect(wrapper.find('td').exists()).toBe(true)
    expect(wrapper.html()).toContain('Cell text')
  })

  it('binds colspan and rowspan from attrs', async () => {
    const { default: TableCell } = await import('../../../../../components/ueditor/render/nodes/table-cell.vue')
    const wrapper = mount(TableCell, {
      props: { node: { type: 'tableCell', attrs: { colspan: 2, rowspan: 3 }, content: [] } },
      global: _globalConfig,
    })
    const td = wrapper.find('td')
    expect(td.attributes('colspan')).toBe('2')
    expect(td.attributes('rowspan')).toBe('3')
  })
})
