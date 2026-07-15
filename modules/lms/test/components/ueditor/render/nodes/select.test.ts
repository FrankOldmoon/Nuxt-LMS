/**
 * ueditor/render/nodes/select.vue component test
 * @see modules/lms/components/ueditor/render/nodes/select.vue
 */
import { describe, it, expect, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { resetAllStubs, setMockI18n, provide } from '../../../../../../../test/setup/nuxt-stubs'

beforeEach(() => {
  resetAllStubs()
  setMockI18n({ locale: { value: 'en' }, t: (k: string) => k, d: (v: any) => String(v) })
})

const _globalStubs = {
  ClientOnly: { template: '<div><slot /></div>' },
}

const _globalConfig = {
  mocks: { $t: (k: string) => k, $i18n: { t: (k: string) => k, locale: { value: 'en' } } },
  stubs: _globalStubs,
}

describe('ueditor/render/nodes/select.vue', () => {
  it('renders a <select> with options from injected questionData', async () => {
    // select.vue gets options via inject('questionData')
    // Register questionData in the global provide stub
    const { ref } = await import('vue')
    provide('questionData', ref({ options: ['Option A', 'Option B'] }))

    const { default: SelectView } = await import('../../../../../components/ueditor/render/nodes/select.vue')
    const wrapper = mount(SelectView, { props: { node: { type: 'select' } }, global: _globalConfig })
    const select = wrapper.find('select')
    expect(select.exists()).toBe(true)
    const options = wrapper.findAll('option')
    // The first is a disabled placeholder, the latter two come from options
    expect(options.length).toBe(3)
    expect(options[1].text()).toBe('Option A')
  })

  it('renders only placeholder when no questionData injected', async () => {
    const { default: SelectView } = await import('../../../../../components/ueditor/render/nodes/select.vue')
    const wrapper = mount(SelectView, { props: { node: { type: 'select' } }, global: _globalConfig })
    expect(wrapper.find('select').exists()).toBe(true)
    expect(wrapper.findAll('option').length).toBe(1)
  })
})
