/**
 * ueditor/render/nodes/column-container.vue 组件测试
 * @see modules/lms/components/ueditor/render/nodes/column-container.vue
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

describe('ueditor/render/nodes/column-container.vue', () => {
  it('renders a column-container div', async () => {
    const { default: ColumnContainer } = await import('../../../../../components/ueditor/render/nodes/column-container.vue')
    const wrapper = mount(ColumnContainer, {
      props: { node: { type: 'columnContainer', content: [{ type: 'column', content: [] }] } },
      global: _globalConfig,
    })
    expect(wrapper.find('.umo-node-column-container').exists()).toBe(true)
  })
})
