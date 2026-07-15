/**
 * ueditor/render/nodes/hard-break.vue component test
 * @see modules/lms/components/ueditor/render/nodes/hard-break.vue
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

describe('ueditor/render/nodes/hard-break.vue', () => {
  it('renders a <br> element', async () => {
    const { default: HardBreak } = await import('../../../../../components/ueditor/render/nodes/hard-break.vue')
    const wrapper = mount(HardBreak, { props: { node: { type: 'hardBreak' } }, global: _globalConfig })
    expect(wrapper.find('br').exists()).toBe(true)
  })
})
