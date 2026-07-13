/**
 * match 组件测试 (render)
 * @see modules/lms/components/ueditor/extensions/nodes/vue/question/render/match.vue
 */
import { describe, it, expect, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { ref } from 'vue'
import { resetAllStubs, setMockI18n } from '../../../../../../../../test/setup/nuxt-stubs'

beforeEach(() => {
  resetAllStubs()
  setMockI18n({ locale: { value: 'en' }, t: (k: string) => k, d: (v: any) => String(v) })
})

const _globalConfig = {
  stubs: {},
  provide: {
    questionSubmitted: ref(false),
    questionIsCorrect: ref(false),
    questionFromRecord: ref(false),
  },
  mocks: { $t: (k: string) => k },
}

describe('question/render/match.vue', () => {
  const sampleQuestion = {
    type: 'match',
    name: 'Match question',
    options: [
      { left: 'A', right: '1' },
      { left: 'B', right: '2' },
    ],
    answer: [0, 1],
    point: 2,
    record: [],
    content: '',
  }

  it('mounts and renders match hint', async () => {
    const { default: MatchRender } = await import(
      '../../../../../../components/ueditor/extensions/nodes/vue/question/render/match.vue'
    )
    const wrapper = mount(MatchRender, {
      props: { question: sampleQuestion, questionId: 1 },
      global: _globalConfig,
    })
    expect(wrapper.text()).toContain('question.matchRenderHint')
  })

  it('renders left and right items', async () => {
    const { default: MatchRender } = await import(
      '../../../../../../components/ueditor/extensions/nodes/vue/question/render/match.vue'
    )
    const wrapper = mount(MatchRender, {
      props: { question: sampleQuestion, questionId: 1 },
      global: _globalConfig,
    })
    expect(wrapper.text()).toContain('A')
    expect(wrapper.text()).toContain('B')
  })

  it('exposes submit/reset/fillCorrectAnswer methods', async () => {
    const { default: MatchRender } = await import(
      '../../../../../../components/ueditor/extensions/nodes/vue/question/render/match.vue'
    )
    const wrapper = mount(MatchRender, {
      props: { question: sampleQuestion, questionId: 1 },
      global: _globalConfig,
    })
    const vm = wrapper.vm as any
    expect(typeof vm.submit).toBe('function')
    expect(typeof vm.reset).toBe('function')
    expect(typeof vm.fillCorrectAnswer).toBe('function')
  })
})
