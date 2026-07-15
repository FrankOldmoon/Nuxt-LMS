/**
 * explanation-block component test
 * @see modules/lms/components/ueditor/extensions/nodes/vue/question/render/explanation-block.vue
 */
import { describe, it, expect, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { resetAllStubs, setMockI18n } from '../../../../../../../../test/setup/nuxt-stubs'

beforeEach(() => {
  resetAllStubs()
  setMockI18n({ locale: { value: 'en' }, t: (k: string) => k, d: (v: any) => String(v) })
})

const _globalStubs = {
  ueditorRender: { template: '<div class="ueditor-render"><slot /></div>', props: ['json'] },
}

const _globalConfig = {
  stubs: _globalStubs,
  mocks: { $t: (k: string) => k },
}

describe('question/render/explanation-block.vue', () => {
  it('renders explanation when provided', async () => {
    const { default: ExplanationBlock } = await import(
      '../../../../../../components/ueditor/extensions/nodes/vue/question/render/explanation-block.vue'
    )
    const wrapper = mount(ExplanationBlock, {
      props: { explanation: 'This is the answer explanation' },
      global: _globalConfig,
    })
    expect(wrapper.text()).toContain('question.explanationAnswer')
  })

  it('does not render when explanation is empty', async () => {
    const { default: ExplanationBlock } = await import(
      '../../../../../../components/ueditor/extensions/nodes/vue/question/render/explanation-block.vue'
    )
    const wrapper = mount(ExplanationBlock, {
      props: { explanation: '' },
      global: _globalConfig,
    })
    expect(wrapper.find('.bg-gray-50').exists()).toBe(false)
  })

  it('accepts default prop value', async () => {
    const { default: ExplanationBlock } = await import(
      '../../../../../../components/ueditor/extensions/nodes/vue/question/render/explanation-block.vue'
    )
    const wrapper = mount(ExplanationBlock, {
      global: _globalConfig,
    })
    expect(wrapper.exists()).toBe(true)
  })
})
