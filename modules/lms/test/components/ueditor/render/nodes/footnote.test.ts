/**
 * ueditor/render/nodes/footnote.vue 组件测试
 * @see modules/lms/components/ueditor/render/nodes/footnote.vue
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

describe('ueditor/render/nodes/footnote.vue', () => {
  it('renders an <li> with data-fn-id and id', async () => {
    const { default: Footnote } = await import('../../../../../components/ueditor/render/nodes/footnote.vue')
    const wrapper = mount(Footnote, {
      props: {
        node: {
          type: 'footnote',
          attrs: { 'data-fn-id': 'fn1', id: 'fn:1' },
          content: [{ type: 'text', text: 'Footnote body' }],
        },
      },
      global: _globalConfig,
    })
    const li = wrapper.find('li')
    expect(li.exists()).toBe(true)
    expect(li.attributes('data-fn-id')).toBe('fn1')
    expect(li.attributes('id')).toBe('fn:1')
    expect(wrapper.html()).toContain('Footnote body')
  })
})
