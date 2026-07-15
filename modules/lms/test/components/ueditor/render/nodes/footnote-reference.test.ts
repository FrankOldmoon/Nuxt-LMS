/**
 * ueditor/render/nodes/footnote-reference.vue component test
 * @see modules/lms/components/ueditor/render/nodes/footnote-reference.vue
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

describe('ueditor/render/nodes/footnote-reference.vue', () => {
  it('renders a <sup> with link to footnote', async () => {
    const { default: FootnoteRef } = await import('../../../../../components/ueditor/render/nodes/footnote-reference.vue')
    const wrapper = mount(FootnoteRef, {
      props: {
        node: {
          type: 'footnoteReference',
          attrs: { referenceNumber: 1, 'data-fn-id': 'fn1' },
        },
      },
      global: _globalConfig,
    })
    const sup = wrapper.find('sup')
    expect(sup.exists()).toBe(true)
    expect(sup.attributes('id')).toBe('fnref:1')
    const link = wrapper.find('a')
    expect(link.exists()).toBe(true)
    expect(link.attributes('href')).toBe('#fn:1')
    expect(link.text()).toContain('[1]')
  })
})
