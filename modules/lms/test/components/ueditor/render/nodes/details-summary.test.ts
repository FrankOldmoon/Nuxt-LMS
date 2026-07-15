/**
 * ueditor/render/nodes/details-summary.vue component test
 * @see modules/lms/components/ueditor/render/nodes/details-summary.vue
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

describe('ueditor/render/nodes/details-summary.vue', () => {
  it('renders a <summary> with content', async () => {
    const { default: DetailsSummary } = await import('../../../../../components/ueditor/render/nodes/details-summary.vue')
    const wrapper = mount(DetailsSummary, {
      props: { node: { type: 'detailsSummary', content: [{ type: 'text', text: 'Summary text' }] } },
      global: _globalConfig,
    })
    expect(wrapper.find('summary').exists()).toBe(true)
    expect(wrapper.html()).toContain('Summary text')
  })
})
