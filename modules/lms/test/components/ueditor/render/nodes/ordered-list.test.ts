/**
 * ueditor/render/nodes/ordered-list.vue component test
 * @see modules/lms/components/ueditor/render/nodes/ordered-list.vue
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

describe('ueditor/render/nodes/ordered-list.vue', () => {
  it('renders an <ol> with default decimal list-style', async () => {
    const { default: OrderedList } = await import('../../../../../components/ueditor/render/nodes/ordered-list.vue')
    const wrapper = mount(OrderedList, {
      props: { node: { type: 'orderedList', attrs: {}, content: [{ type: 'listItem', content: [{ type: 'text', text: 'First' }] }] } },
      global: _globalConfig,
    })
    expect(wrapper.find('ol').exists()).toBe(true)
    expect(wrapper.find('ol').attributes('data-type')).toBe('decimal')
    expect(wrapper.html()).toContain('First')
  })

  it('does not set data-start when start is 1 or missing', async () => {
    const { default: OrderedList } = await import('../../../../../components/ueditor/render/nodes/ordered-list.vue')
    const wrapper = mount(OrderedList, {
      props: { node: { type: 'orderedList', attrs: { start: 1 }, content: [] } },
      global: _globalConfig,
    })
    expect(wrapper.find('ol').attributes('data-start')).toBeUndefined()
  })

  it('sets data-start when start is not 1', async () => {
    const { default: OrderedList } = await import('../../../../../components/ueditor/render/nodes/ordered-list.vue')
    const wrapper = mount(OrderedList, {
      props: { node: { type: 'orderedList', attrs: { start: 5 }, content: [] } },
      global: _globalConfig,
    })
    expect(wrapper.find('ol').attributes('data-start')).toBe('5')
  })
})
