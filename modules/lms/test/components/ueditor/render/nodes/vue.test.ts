// ueditor/render/nodes/vue.vue component tests
// @see modules/lms/components/ueditor/render/nodes/vue.vue
//
// vue node loads extension render components via import.meta.glob.
// Test env has no network; we only verify mounting and basic logic.
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

describe('ueditor/render/nodes/vue.vue', () => {
  it('mounts without error for a question type node', async () => {
    const { default: VueView } = await import('../../../../../components/ueditor/render/nodes/vue.vue')
    const wrapper = mount(VueView, {
      props: { node: { type: 'vue', attrs: { type: 'question', content: '1' } } },
      global: _globalConfig,
    })
    expect(wrapper.exists()).toBe(true)
  })

  it('renders nothing when type is unknown', async () => {
    const { default: VueView } = await import('../../../../../components/ueditor/render/nodes/vue.vue')
    const wrapper = mount(VueView, {
      props: { node: { type: 'vue', attrs: { type: 'nonexistent', content: '' } } },
      global: _globalConfig,
    })
    // Unknown type → comp is null → v-if false → only comment placeholder, no real content
    expect(wrapper.text()).toBe('')
  })
})
