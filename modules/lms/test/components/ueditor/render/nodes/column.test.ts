/**
 * ueditor/render/nodes/column.vue component test
 * @see modules/lms/components/ueditor/render/nodes/column.vue
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

describe('ueditor/render/nodes/column.vue', () => {
  it('renders a column div with default width 200px', async () => {
    const { default: Column } = await import('../../../../../components/ueditor/render/nodes/column.vue')
    const wrapper = mount(Column, {
      props: { node: { type: 'column', attrs: {}, content: [{ type: 'text', text: 'Col' }] } },
      global: _globalConfig,
    })
    expect(wrapper.find('.umo-node-column').exists()).toBe(true)
    expect(wrapper.html()).toContain('width: 200px')
  })

  it('uses custom colWidth from attrs', async () => {
    const { default: Column } = await import('../../../../../components/ueditor/render/nodes/column.vue')
    const wrapper = mount(Column, {
      props: { node: { type: 'column', attrs: { colWidth: 400 }, content: [] } },
      global: _globalConfig,
    })
    expect(wrapper.html()).toContain('width: 400px')
  })
})
