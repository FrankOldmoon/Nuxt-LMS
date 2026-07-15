/**
 * quiz render result component test
 * @see modules/lms/components/ueditor/extensions/nodes/vue/quiz/render/result.vue
 */
import { describe, it, expect, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { ref } from 'vue'
import { resetAllStubs, setMockI18n } from '../../../../../../../../test/setup/nuxt-stubs'
import { QuizRenderKey } from '../../../../../../components/ueditor/extensions/nodes/vue/quiz/useQuizRender'

beforeEach(() => {
  resetAllStubs()
  setMockI18n({ locale: { value: 'en' }, t: (k: string) => k, d: (v: any) => String(v) })
})

function makeMockContext(overrides: any = {}) {
  return {
    t: (k: string) => k,
    quiz: ref({ name: 'Test Quiz', point: 100 }),
    resultScore: ref(80),
    resultPassed: ref(true),
    ...overrides,
  }
}

const _globalConfig = {
  mocks: { $t: (k: string) => k },
}

describe('quiz/render/result.vue', () => {
  it('renders score and passed message when passed', async () => {
    const { default: QuizResult } = await import(
      '../../../../../../components/ueditor/extensions/nodes/vue/quiz/render/result.vue'
    )
    const ctx = makeMockContext({ resultScore: ref(80), resultPassed: ref(true) })
    const wrapper = mount(QuizResult, {
      global: { ..._globalConfig, provide: { [QuizRenderKey as any]: ctx } },
    })
    expect(wrapper.text()).toContain('80')
    expect(wrapper.text()).toContain('100')
    expect(wrapper.text()).toContain('quiz.passed')
  })

  it('renders notPassed message when failed', async () => {
    const { default: QuizResult } = await import(
      '../../../../../../components/ueditor/extensions/nodes/vue/quiz/render/result.vue'
    )
    const ctx = makeMockContext({ resultScore: ref(30), resultPassed: ref(false) })
    const wrapper = mount(QuizResult, {
      global: { ..._globalConfig, provide: { [QuizRenderKey as any]: ctx } },
    })
    expect(wrapper.text()).toContain('30')
    expect(wrapper.text()).toContain('quiz.notPassed')
  })

  it('applies green styling when passed', async () => {
    const { default: QuizResult } = await import(
      '../../../../../../components/ueditor/extensions/nodes/vue/quiz/render/result.vue'
    )
    const ctx = makeMockContext({ resultPassed: ref(true) })
    const wrapper = mount(QuizResult, {
      global: { ..._globalConfig, provide: { [QuizRenderKey as any]: ctx } },
    })
    expect(wrapper.html()).toContain('bg-green-50')
  })

  it('applies red styling when not passed', async () => {
    const { default: QuizResult } = await import(
      '../../../../../../components/ueditor/extensions/nodes/vue/quiz/render/result.vue'
    )
    const ctx = makeMockContext({ resultPassed: ref(false) })
    const wrapper = mount(QuizResult, {
      global: { ..._globalConfig, provide: { [QuizRenderKey as any]: ctx } },
    })
    expect(wrapper.html()).toContain('bg-red-50')
  })
})
