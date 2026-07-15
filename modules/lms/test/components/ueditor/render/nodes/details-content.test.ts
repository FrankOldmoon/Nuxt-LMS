/**
 * ueditor/render/nodes/details-content.vue component test
 * @see modules/lms/components/ueditor/render/nodes/details-content.vue
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

describe('ueditor/render/nodes/details-content.vue', () => {
  it('renders a details-content div with data-type', async () => {
    const { default: DetailsContent } = await import('../../../../../components/ueditor/render/nodes/details-content.vue')
    const wrapper = mount(DetailsContent, {
      props: { node: { type: 'detailsContent', content: [{ type: 'text', text: 'Hidden content' }] } },
      global: _globalConfig,
    })
    const div = wrapper.find('.umo-node-details-content')
    expect(div.exists()).toBe(true)
    expect(div.attributes('data-type')).toBe('detailsContent')
    expect(wrapper.html()).toContain('Hidden content')
  })
})
