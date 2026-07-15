/**
 * result-banner component test
 * @see modules/lms/components/ueditor/extensions/nodes/vue/question/render/result-banner.vue
 */
import { describe, it, expect, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { resetAllStubs, setMockI18n } from '../../../../../../../../test/setup/nuxt-stubs'

beforeEach(() => {
  resetAllStubs()
  setMockI18n({ locale: { value: 'en' }, t: (k: string) => k, d: (v: any) => String(v) })
})

const _globalConfig = {
  mocks: { $t: (k: string, params?: any) => {
    if (params) {
      let s = k
      for (const [kk, v] of Object.entries(params)) s = s.replace(`{${kk}}`, String(v))
      return s
    }
    return k
  } },
}

describe('question/render/result-banner.vue', () => {
  it('renders correct feedback when correct=true', async () => {
    const { default: ResultBanner } = await import(
      '../../../../../../components/ueditor/extensions/nodes/vue/question/render/result-banner.vue'
    )
    const wrapper = mount(ResultBanner, {
      props: { correct: true, point: 5 },
      global: _globalConfig,
    })
    expect(wrapper.text()).toContain('✓')
    expect(wrapper.text()).toContain('question.correctFeedback')
  })

  it('renders wrong feedback when correct=false', async () => {
    const { default: ResultBanner } = await import(
      '../../../../../../components/ueditor/extensions/nodes/vue/question/render/result-banner.vue'
    )
    const wrapper = mount(ResultBanner, {
      props: { correct: false, point: 0 },
      global: _globalConfig,
    })
    expect(wrapper.text()).toContain('✗')
    expect(wrapper.text()).toContain('question.wrongFeedback')
  })

  it('applies green styling when correct', async () => {
    const { default: ResultBanner } = await import(
      '../../../../../../components/ueditor/extensions/nodes/vue/question/render/result-banner.vue'
    )
    const wrapper = mount(ResultBanner, {
      props: { correct: true, point: 3 },
      global: _globalConfig,
    })
    expect(wrapper.html()).toContain('bg-green-50')
  })
})
