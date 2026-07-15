/**
 * ueditor/render/nodes/table-header.vue component test
 * @see modules/lms/components/ueditor/render/nodes/table-header.vue
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

describe('ueditor/render/nodes/table-header.vue', () => {
  it('renders a <th> with content', async () => {
    const { default: TableHeader } = await import('../../../../../components/ueditor/render/nodes/table-header.vue')
    const wrapper = mount(TableHeader, {
      props: { node: { type: 'tableHeader', attrs: {}, content: [{ type: 'text', text: 'Header' }] } },
      global: _globalConfig,
    })
    expect(wrapper.find('th').exists()).toBe(true)
    expect(wrapper.html()).toContain('Header')
  })

  it('binds align attr', async () => {
    const { default: TableHeader } = await import('../../../../../components/ueditor/render/nodes/table-header.vue')
    const wrapper = mount(TableHeader, {
      props: { node: { type: 'tableHeader', attrs: { align: 'center' }, content: [] } },
      global: _globalConfig,
    })
    expect(wrapper.find('th').attributes('align')).toBe('center')
  })
})
