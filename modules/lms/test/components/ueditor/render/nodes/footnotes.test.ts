/**
 * ueditor/render/nodes/footnotes.vue component test
 * @see modules/lms/components/ueditor/render/nodes/footnotes.vue
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

describe('ueditor/render/nodes/footnotes.vue', () => {
  it('renders an <ol> with footnotes class', async () => {
    const { default: Footnotes } = await import('../../../../../components/ueditor/render/nodes/footnotes.vue')
    const wrapper = mount(Footnotes, {
      props: { node: { type: 'footnotes', content: [{ type: 'footnote', attrs: {}, content: [] }] } },
      global: _globalConfig,
    })
    expect(wrapper.find('ol.umo-node-footnotes').exists()).toBe(true)
  })
})
